"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchActivityRelativeEffort,
  fetchActivityStreams,
  fetchAthleteActivities,
  refreshStravaToken,
  revokeStravaToken,
} from "@/lib/strava/client";
import { buildUploadedActivityFromStrava } from "@/lib/strava/activity-import";
import { formatDurationLabel } from "@/lib/fit-import";

// Janela de sincronização: só as atividades dos últimos 30 dias. Sem isso,
// "sincronizar agora" traz até 30 atividades sempre, não importa a data —
// pra quem treina bem pouco isso podia voltar meses no passado de uma vez.
// 30 (em vez de 20) dá margem pra ter pelo menos 2 semanas fechadas de
// carga e testar o Alerta de overtraining no Monitoramento.
const SYNC_WINDOW_DAYS = 30;

/**
 * "Sincronizar agora" — puxa as atividades dos últimos SYNC_WINDOW_DAYS
 * dias do Strava sob demanda (não existia nenhum gatilho pra isso antes; a
 * conexão OAuth em si já funcionava, só nunca buscava atividade nenhuma).
 * Renova o token
 * automaticamente quando expirado, mesma lógica que estava parada e sem uso
 * em api/strava/sync/route.ts (removida — virou este Server Action, no
 * mesmo padrão do resto do app).
 *
 * Quando uma atividade cai num dia que já tinha um treino prescrito ainda
 * não concluído, busca os streams (potência/FC/cadência/altimetria ponto a
 * ponto) e completa esse treino igual a um upload de .FIT — sem isso, quem
 * só conecta a Strava nunca teria os gráficos de "Analisar treino do aluno",
 * só o resumo. Nunca sobrescreve um treino já concluído (RPE ou .FIT
 * anterior tem prioridade sobre o que a Strava sincronizou depois).
 */
/**
 * "Desconectar" — apaga o vínculo do Strava dessa conta. Sem isso, quem
 * conectasse a conta errada do Strava ficava preso nela pra sempre: o
 * botão só existia pra conectar, nunca pra trocar. Revoga a autorização
 * do lado da Strava também (melhor esforço — se falhar, não impede
 * desconectar aqui, só quer dizer que a Strava ainda vai lembrar do app
 * autorizado até a pessoa revogar por lá também), e sempre apaga o
 * registro local, que é o que realmente prende a conta errada.
 */
export async function disconnectStrava(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from("strava_tokens")
    .select("access_token")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (tokenRow) {
    try {
      await revokeStravaToken(tokenRow.access_token);
    } catch (e) {
      console.error("[strava] falha ao revogar autorização (desconectando localmente mesmo assim):", e);
    }
  }

  await admin.from("strava_tokens").delete().eq("profile_id", user.id);
  revalidatePath("/dashboard");
}

export async function syncStravaNow(): Promise<{ synced: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  // Mesma checagem de suspensão de profile-actions.ts — cobre uma aba que
  // já estava aberta antes da conta ser suspensa (o proxy só barra numa
  // navegação nova).
  const { data: profileData } = await supabase.from("profiles").select("active").eq("id", user.id).single();
  // O generic da tabela via @supabase/ssr não propaga aqui; o shape é
  // conhecido (profiles.active) então a asserção é segura.
  if (!(profileData as { active: boolean } | null)?.active) {
    throw new Error("Esta conta está suspensa. Fale com seu treinador.");
  }

  const admin = createAdminClient();
  const { data: tokenRow } = await admin.from("strava_tokens").select("*").eq("profile_id", user.id).single();
  if (!tokenRow) throw new Error("Strava não conectado.");

  let accessToken = tokenRow.access_token;
  const isExpired = new Date(tokenRow.expires_at).getTime() <= Date.now();

  if (isExpired) {
    const refreshed = await refreshStravaToken(tokenRow.refresh_token);
    accessToken = refreshed.access_token;

    await admin
      .from("strava_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", user.id);
  }

  const after = Math.floor((Date.now() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000) / 1000);

  let activities;
  try {
    // per_page alto o bastante pra cobrir a janela mesmo pra quem treina
    // 2x/dia (Strava limita a 200 por página) — quem filtra de verdade é o
    // "after".
    activities = await fetchAthleteActivities(accessToken, { after, perPage: 100 });
  } catch (e) {
    console.error("[strava] erro ao buscar atividades:", e instanceof Error ? e.message : e);
    throw new Error("Não foi possível buscar as atividades do Strava agora. Tente de novo em instantes.");
  }

  if (activities.length > 0) {
    await admin.from("strava_activities").upsert(
      activities.map((activity) => ({
        profile_id: user.id,
        strava_activity_id: activity.id,
        name: activity.name,
        type: activity.type,
        distance_meters: activity.distance,
        moving_time_seconds: activity.moving_time,
        start_date: activity.start_date,
        average_heartrate: activity.average_heartrate ?? null,
        raw: activity as unknown as Record<string, unknown>,
      })),
      { onConflict: "strava_activity_id" }
    );
  }

  // Relative Effort (suffer_score) — base do ACWR no Alerta de overtraining
  // — só vem no detalhe de cada atividade, não na listagem. Busca só pra
  // quem ainda não tem, pra não rebuscar em toda sincronização.
  const { data: missingEffortRows } = await admin
    .from("strava_activities")
    .select("strava_activity_id")
    .in(
      "strava_activity_id",
      activities.map((a) => a.id)
    )
    .is("relative_effort", null);

  for (const row of missingEffortRows ?? []) {
    try {
      const relativeEffort = await fetchActivityRelativeEffort(accessToken, row.strava_activity_id);
      if (relativeEffort != null) {
        await admin
          .from("strava_activities")
          .update({ relative_effort: relativeEffort })
          .eq("strava_activity_id", row.strava_activity_id);
      }
    } catch (e) {
      console.error("[strava] erro ao buscar relative effort:", e instanceof Error ? e.message : e);
    }
  }

  // Já com relative_effort atualizado (loop acima) — reconsulta pra ter o
  // valor de todas as atividades desta sincronização à mão, sem refazer
  // chamada nenhuma à Strava.
  const { data: effortRows } = await admin
    .from("strava_activities")
    .select("strava_activity_id, relative_effort")
    .in(
      "strava_activity_id",
      activities.map((a) => a.id)
    );
  const relativeEffortById = new Map((effortRows ?? []).map((r) => [r.strava_activity_id, r.relative_effort]));

  const { data: aluno } = await admin.from("alunos").select("id").eq("user_id", user.id).maybeSingle();

  if (aluno) {
    for (const activity of activities) {
      const dateIso = activity.start_date_local.slice(0, 10);

      const { data: treino } = await admin
        .from("treinos")
        .select("concluido")
        .eq("aluno_id", aluno.id)
        .eq("data", dateIso)
        .maybeSingle();

      // Sem treino prescrito nesse dia, ou já concluído por outra fonte —
      // nada pra anexar (a atividade continua registrada em
      // strava_activities de qualquer forma).
      if (!treino || treino.concluido) continue;

      let streams;
      try {
        streams = await fetchActivityStreams(accessToken, activity.id);
      } catch (e) {
        console.error("[strava] erro ao buscar streams:", e instanceof Error ? e.message : e);
        continue;
      }

      const uploadedActivity = buildUploadedActivityFromStrava(activity, streams, relativeEffortById.get(activity.id) ?? null);

      await admin
        .from("treinos")
        .update({
          concluido: true,
          duracao_real: uploadedActivity.durationSeconds != null ? formatDurationLabel(uploadedActivity.durationSeconds) : null,
          distancia_real: uploadedActivity.distanceMeters,
          atividade_fit: uploadedActivity,
        })
        .eq("aluno_id", aluno.id)
        .eq("data", dateIso);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/cockpit");
  return { synced: activities.length };
}
