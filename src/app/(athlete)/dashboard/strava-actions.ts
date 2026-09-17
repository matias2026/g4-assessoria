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

// Regra da sincronização: sempre as últimas 20 atividades do atleta,
// independente de data — não uma janela de dias, que sub-sincronizava
// quem treina raramente (período curto demais) ou trazia volume
// desnecessário de quem treina todo dia. "Últimas 20" é sempre o mesmo
// volume de chamadas à API, não importa o padrão de treino do aluno.
const SYNC_LAST_N_ACTIVITIES = 20;

/**
 * "Sincronizar agora" — puxa as últimas SYNC_LAST_N_ACTIVITIES atividades
 * do Strava sob demanda (não existia nenhum gatilho pra isso antes; a
 * conexão OAuth em si já funcionava, só nunca buscava atividade nenhuma).
 * Renova o token automaticamente quando expirado, mesma lógica que estava
 * parada e sem uso em api/strava/sync/route.ts (removida — virou este
 * Server Action, no mesmo padrão do resto do app).
 *
 * Todas as atividades buscadas são sempre gravadas em `strava_activities`
 * (usada pro cálculo de carga/ACWR no Monitoramento, ver
 * src/lib/monitoring.ts — conta cada atividade, mesmo mais de uma no
 * mesmo dia). Só a ligação com o treino prescrito do dia (que dá os
 * gráficos ponto a ponto de "Analisar treino do aluno") é 1 por dia — se o
 * aluno registrou mais de uma atividade no mesmo dia, escolhe a de maior
 * duração (a sessão principal), não a primeira que a API devolveu. Nunca
 * sobrescreve um treino já concluído por outra fonte (RPE manual ou .FIT
 * enviado tem prioridade sobre o que a Strava sincronizou depois).
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

  let activities;
  try {
    activities = await fetchAthleteActivities(accessToken, { perPage: SYNC_LAST_N_ACTIVITIES });
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
    // Um treino é 1 linha por dia — se o aluno registrou mais de uma
    // atividade na Strava no mesmo dia (ex.: pedal de manhã + academia à
    // tarde), só dá pra anexar uma a esse treino. Antes, "uma" significava
    // a primeira do array (a mais recente do dia, já que a Strava devolve
    // em ordem decrescente) — trocado pela de maior duração, que é a
    // sessão principal do dia na maioria dos casos.
    const mainActivityByDate = new Map<string, (typeof activities)[number]>();
    for (const activity of activities) {
      const dateIso = activity.start_date_local.slice(0, 10);
      const current = mainActivityByDate.get(dateIso);
      if (!current || activity.moving_time > current.moving_time) {
        mainActivityByDate.set(dateIso, activity);
      }
    }

    for (const [dateIso, activity] of mainActivityByDate) {
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
