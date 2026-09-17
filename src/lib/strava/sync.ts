import type { createAdminClient } from "@/lib/supabase/admin";
import { fetchActivityRelativeEffort, fetchActivityStreams, fetchAthleteActivities } from "./client";
import { buildUploadedActivityFromStrava } from "./activity-import";
import { formatDurationLabel } from "@/lib/fit-import";

/**
 * Núcleo da sincronização com o Strava — busca as últimas `limit`
 * atividades e grava tudo, sem depender de o aluno ter (ou não) um treino
 * prescrito: `strava_activities` recebe toda atividade buscada, sempre,
 * porque é ela que alimenta a carga/ACWR do Monitoramento (ver
 * src/lib/monitoring.ts) — nunca faz sentido esperar um treino prescrito
 * pra isso. Só o passo extra de anexar os gráficos ponto a ponto a um
 * treino do dia (pra "Analisar treino do aluno") depende de existir um
 * treino prescrito naquele dia; sem ele, a atividade continua sincronizada
 * e contando pra carga, só sem os gráficos detalhados.
 *
 * Usado tanto pelo Server Action "Sincronizar agora" (dashboard/
 * strava-actions.ts) quanto direto no callback do OAuth (api/strava/
 * callback/route.ts), pra já trazer o histórico assim que a conta conecta,
 * sem esperar o aluno clicar em nada.
 */
export async function pullStravaActivities(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  accessToken: string,
  limit: number
): Promise<{ synced: number }> {
  let activities;
  try {
    activities = await fetchAthleteActivities(accessToken, { perPage: limit });
  } catch (e) {
    console.error("[strava] erro ao buscar atividades:", e instanceof Error ? e.message : e);
    throw new Error("Não foi possível buscar as atividades do Strava agora. Tente de novo em instantes.");
  }

  if (activities.length > 0) {
    await admin.from("strava_activities").upsert(
      activities.map((activity) => ({
        profile_id: profileId,
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

  const { data: aluno } = await admin.from("alunos").select("id").eq("user_id", profileId).maybeSingle();

  if (aluno) {
    // Um treino é 1 linha por dia — se o aluno registrou mais de uma
    // atividade na Strava no mesmo dia (ex.: pedal de manhã + academia à
    // tarde), só dá pra anexar uma a esse treino. Escolhe a de maior
    // duração (a sessão principal do dia), não a primeira que a API
    // devolveu.
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
      // nada pra anexar (a atividade já está registrada em
      // strava_activities de qualquer forma, feito acima).
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

  return { synced: activities.length };
}
