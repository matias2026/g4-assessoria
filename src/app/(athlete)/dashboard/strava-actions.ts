"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchActivityStreams, fetchAthleteActivities, refreshStravaToken } from "@/lib/strava/client";
import { buildUploadedActivityFromStrava } from "@/lib/strava/activity-import";
import { formatDurationLabel } from "@/lib/fit-import";

/**
 * "Sincronizar agora" — puxa as atividades recentes do Strava sob demanda
 * (não existia nenhum gatilho pra isso antes; a conexão OAuth em si já
 * funcionava, só nunca buscava atividade nenhuma). Renova o token
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
export async function syncStravaNow(): Promise<{ synced: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

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
    activities = await fetchAthleteActivities(accessToken, { perPage: 30 });
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

      const uploadedActivity = buildUploadedActivityFromStrava(activity, streams);

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
