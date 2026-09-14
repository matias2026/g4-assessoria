"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { computeTrimp } from "@/lib/trimp";
import { requireCoachOrAdmin } from "./actions";

// Janela de 6 semanas: cobre os 28 dias da carga crônica do ACWR com folga,
// sem carregar o histórico inteiro do aluno a cada troca de seleção.
const WINDOW_DAYS = 42;
const ACWR_ACUTE_DAYS = 7;
const ACWR_CHRONIC_DAYS = 28;

export type CompletedSessionSource = "fit" | "strava" | "rpe";

export interface CompletedSession {
  dateIso: string;
  source: CompletedSessionSource;
  distanceMeters: number | null;
  durationSeconds: number | null;
  tss: number | null;
  // TRIMP (Banister) — calculado localmente a partir de FC média + duração
  // + FC máx/repouso cadastradas na ficha do aluno (ver src/lib/trimp.ts).
  // null quando falta FC média da sessão ou FC máx/repouso na ficha.
  trimp: number | null;
  relativeEffort: number | null;
  rpe: number | null;
}

// A maioria dos .FIT/Strava não vem com TSS calculado (precisa de FTP
// calibrado). Prioridade de métrica de carga: TSS > TRIMP (FC média +
// duração, calculado por nós, funciona pra .FIT e Strava) > Relative
// Effort da Strava (suffer_score, só existe pra atividade sincronizada) >
// minutos treinados — essa última sempre existe, garantindo que o
// Evolução/Alerta nunca fiquem sem nenhum dado quando há treino concluído.
export type LoadMetric = "tss" | "trimp" | "relative_effort" | "minutes";

export interface WeeklyLoad {
  weekStartIso: string;
  value: number; // soma na métrica escolhida — ver `loadMetric`
}

export interface AcwrResult {
  ratio: number; // carga aguda / carga crônica (média semanal)
  acuteLoad: number; // soma dos últimos 7 dias
  chronicWeeklyAvg: number; // média semanal dos últimos 28 dias (soma/4)
  metric: LoadMetric;
}

export interface MonitoringSummary {
  sessions: CompletedSession[];
  totalCount: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  avgRpe: number | null;
  weeklyLoad: WeeklyLoad[];
  // null só quando não há nenhum dado de carga possível (nem TSS, nem
  // Relative Effort, nem duração) — aí weeklyLoad vem sempre vazio.
  loadMetric: LoadMetric | null;
  // null quando a carga crônica (28 dias) ainda está zerada — sem uma
  // base histórica, a razão não significa nada.
  acwr: AcwrResult | null;
}

// Segunda-feira (UTC) da semana ISO de uma data "YYYY-MM-DD".
function isoWeekStart(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d.toISOString().slice(0, 10);
}

function isoDateDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function sessionLoad(session: CompletedSession, metric: LoadMetric): number | null {
  if (metric === "tss") return session.tss;
  if (metric === "trimp") return session.trimp;
  if (metric === "relative_effort") return session.relativeEffort;
  return session.durationSeconds != null ? session.durationSeconds / 60 : null;
}

/**
 * Resumo de treinos concluídos pra aba "Monitoramento do Aluno" — combina as
 * duas fontes reais de dado que existem hoje: `treinos` (upload manual de
 * .FIT, atividade da Strava anexada ao dia, ou conclusão só com RPE — ver
 * profile-actions.ts e dashboard/strava-actions.ts) e `strava_activities`
 * (toda atividade sincronizada, mesmo sem treino prescrito naquele dia —
 * ver syncStravaNow). Uma atividade que já virou treino do dia não conta
 * duas vezes: fica de fora da segunda fonte pra não duplicar a sessão.
 */
export async function getMonitoringSummary(studentId: string, userId: string | null): Promise<MonitoringSummary> {
  await requireCoachOrAdmin();
  const admin = createAdminClient();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - WINDOW_DAYS);
  const sinceDateIso = since.toISOString().slice(0, 10);

  const [treinoResult, stravaRows, alunoResult] = await Promise.all([
    admin
      .from("treinos")
      .select("data, distancia_real, tss_real, rpe_esforco, atividade_fit")
      .eq("aluno_id", studentId)
      .eq("concluido", true)
      .gte("data", sinceDateIso),
    userId
      ? admin
          .from("strava_activities")
          .select("start_date, distance_meters, moving_time_seconds, average_heartrate, relative_effort")
          .eq("profile_id", userId)
          .gte("start_date", since.toISOString())
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
    admin.from("alunos").select("sex, cycling_profile, running_profile").eq("id", studentId).single(),
  ]);

  if (treinoResult.error) {
    console.error("[cockpit] erro ao buscar treinos concluídos p/ monitoramento:", treinoResult.error.message);
  }

  // FC máx/repouso cadastradas na ficha — só o perfil de ciclismo pede FC de
  // repouso hoje, então TRIMP só fica disponível pra quem tem isso
  // preenchido (normalmente ciclistas). Sem inventar um valor padrão pra
  // preencher a lacuna.
  const aluno = alunoResult.data;
  const hrMax = aluno?.cycling_profile?.hrMax ?? aluno?.running_profile?.hrMax ?? null;
  const hrRest = aluno?.cycling_profile?.hrRest ?? null;
  const sex = aluno?.sex ?? null;

  function trimpFor(avgHeartRate: number | null, durationSeconds: number | null): number | null {
    if (avgHeartRate == null || durationSeconds == null || hrMax == null || hrRest == null) return null;
    return computeTrimp({ avgHeartRate, durationSeconds, hrRest, hrMax, sex });
  }

  const sessions: CompletedSession[] = [];
  const treinoDates = new Set<string>();

  for (const row of treinoResult.data ?? []) {
    treinoDates.add(row.data);
    const durationSeconds = row.atividade_fit?.durationSeconds ?? null;
    sessions.push({
      dateIso: row.data,
      source: row.atividade_fit?.source === "strava" ? "strava" : row.atividade_fit ? "fit" : "rpe",
      distanceMeters: row.distancia_real ?? row.atividade_fit?.distanceMeters ?? null,
      durationSeconds,
      tss: row.tss_real,
      trimp: trimpFor(row.atividade_fit?.avgHeartRate ?? null, durationSeconds),
      relativeEffort: row.atividade_fit?.relativeEffort ?? null,
      rpe: row.rpe_esforco,
    });
  }

  for (const activity of stravaRows) {
    const dateIso = activity.start_date.slice(0, 10);
    // Uma atividade que já virou o treino do dia (ver strava-actions.ts,
    // syncStravaNow) já está contada acima — contar de novo aqui duplicaria
    // a mesma sessão de treino.
    if (treinoDates.has(dateIso)) continue;
    sessions.push({
      dateIso,
      source: "strava",
      distanceMeters: activity.distance_meters,
      durationSeconds: activity.moving_time_seconds,
      // Strava só devolve TSS com um FTP calibrado na própria conta do
      // atleta lá — não temos isso aqui, então fica de fora em vez de
      // estimar um número que pareceria real.
      tss: null,
      trimp: trimpFor(activity.average_heartrate, activity.moving_time_seconds),
      relativeEffort: activity.relative_effort,
      rpe: null,
    });
  }

  sessions.sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  const totalDistanceMeters = sessions.reduce((sum, s) => sum + (s.distanceMeters ?? 0), 0);
  const totalDurationSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);

  const rpeValues = sessions.map((s) => s.rpe).filter((v): v is number => v != null);
  const avgRpe = rpeValues.length > 0 ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length : null;

  const loadMetric: LoadMetric | null = sessions.some((s) => s.tss != null)
    ? "tss"
    : sessions.some((s) => s.trimp != null)
      ? "trimp"
      : sessions.some((s) => s.relativeEffort != null)
        ? "relative_effort"
        : sessions.some((s) => s.durationSeconds != null)
          ? "minutes"
          : null;

  const weeklyMap = new Map<string, number>();
  const dailyLoad = new Map<string, number>();
  if (loadMetric) {
    for (const session of sessions) {
      const load = sessionLoad(session, loadMetric);
      if (load == null) continue;
      const week = isoWeekStart(session.dateIso);
      weeklyMap.set(week, (weeklyMap.get(week) ?? 0) + load);
      dailyLoad.set(session.dateIso, (dailyLoad.get(session.dateIso) ?? 0) + load);
    }
  }
  const weeklyLoad = [...weeklyMap.entries()]
    .map(([weekStartIso, value]) => ({ weekStartIso, value }))
    .sort((a, b) => a.weekStartIso.localeCompare(b.weekStartIso));

  // ACWR: carga aguda (últimos 7 dias, incluindo hoje) dividida pela média
  // semanal da carga crônica (últimos 28 dias / 4) — método padrão da
  // literatura esportiva (Gabbett et al.) pra detectar salto perigoso de
  // volume/intensidade. Dias sem treino contam como carga zero (normal —
  // descanso é esperado, não "falta de dado").
  let acwr: AcwrResult | null = null;
  if (loadMetric) {
    let acuteLoad = 0;
    for (let i = 0; i < ACWR_ACUTE_DAYS; i++) acuteLoad += dailyLoad.get(isoDateDaysAgo(i)) ?? 0;

    let chronicSum = 0;
    for (let i = 0; i < ACWR_CHRONIC_DAYS; i++) chronicSum += dailyLoad.get(isoDateDaysAgo(i)) ?? 0;
    const chronicWeeklyAvg = chronicSum / (ACWR_CHRONIC_DAYS / 7);

    if (chronicWeeklyAvg > 0) {
      acwr = { ratio: acuteLoad / chronicWeeklyAvg, acuteLoad, chronicWeeklyAvg, metric: loadMetric };
    }
  }

  return {
    sessions,
    totalCount: sessions.length,
    totalDistanceMeters,
    totalDurationSeconds,
    avgRpe,
    weeklyLoad,
    loadMetric,
    acwr,
  };
}
