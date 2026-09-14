"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { computeTrimp } from "@/lib/trimp";
import { computeZoneSeconds } from "@/lib/hr-zones";
import { requireCoachOrAdmin } from "./actions";

// Janela de 6 semanas: cobre os 28 dias da carga crônica do ACWR com folga,
// sem carregar o histórico inteiro do aluno a cada troca de seleção.
const WINDOW_DAYS = 42;
const ACWR_ACUTE_DAYS = 7;
const ACWR_CHRONIC_DAYS = 28;
// Quantos dias de histórico do ACWR dá pra reconstruir sem aumentar
// WINDOW_DAYS: o dia mais antigo (offset ACWR_HISTORY_DAYS - 1) ainda
// precisa enxergar 28 dias de crônica pra trás dentro da janela de 42 dias
// (offset + ACWR_CHRONIC_DAYS - 1 <= WINDOW_DAYS - 1).
const ACWR_HISTORY_DAYS = WINDOW_DAYS - ACWR_CHRONIC_DAYS + 1;

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
  // Só populadas quando a sessão veio de um treino com atividade_fit (.FIT
  // ou Strava anexada ao dia) — uma atividade solta do Strava (sem virar
  // treino do dia) não tem cadência guardada em lugar nenhum hoje.
  avgCadence: number | null;
  avgHeartRate: number | null;
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

export interface AcwrHistoryPoint {
  dateIso: string;
  ratio: number;
}

export interface AcwrResult {
  ratio: number; // carga aguda / carga crônica (média semanal)
  acuteLoad: number; // soma dos últimos 7 dias
  chronicWeeklyAvg: number; // média semanal dos últimos 28 dias (soma/4)
  metric: LoadMetric;
  // Série diária do ACWR (mais antigo → mais recente) — só os dias em que
  // já dava pra calcular uma crônica de 28 dias dentro da janela de dados
  // (ver ACWR_HISTORY_DAYS). Alimenta o gráfico de tendência do card de
  // overtraining.
  history: AcwrHistoryPoint[];
}

export interface CardiacEfficiencyPoint {
  weekStartIso: string;
  value: number; // média de (cadência média / FC média) das sessões da semana
}

export interface CardiacEfficiencyResult {
  points: CardiacEfficiencyPoint[];
  pctChange: number; // variação entre as 2 últimas semanas com dado
  // true quando a eficiência caiu o suficiente pra sugerir fadiga
  // acumulada (mesma cadência exigindo FC cada vez mais alta).
  declining: boolean;
}

export interface WeeklyZoneMinutes {
  weekStartIso: string;
  leve: number; // Z1+Z2 — minutos
  moderado: number; // Z3 — minutos
  intenso: number; // Z4+Z5 — minutos
}

export interface ZoneLoadResult {
  weeks: WeeklyZoneMinutes[];
  // true quando o "intenso" (Z4+Z5) da última semana saltou em relação à
  // anterior — gatilho clássico de overtraining mesmo quando o volume
  // total (ACWR) ainda parece normal.
  intensoSpike: boolean;
  intensoPctChange: number | null;
}

export interface RpeTrendResult {
  recentAvg: number; // média de RPE dos últimos 7 dias
  baselineAvg: number; // média de RPE das ~3 semanas anteriores a isso
  // true quando o RPE recente subiu bem acima do baseline — sinal
  // subjetivo do aluno reforçando (ou não) o que os dados objetivos dizem.
  rising: boolean;
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
  // null quando não há pelo menos 2 semanas com cadência e FC média juntas
  // na mesma sessão.
  cardiacEfficiency: CardiacEfficiencyResult | null;
  // null quando nenhuma sessão do período tem amostras de FC ponto a ponto
  // (só treinos com .FIT/Strava anexado têm isso — atividade solta da
  // Strava sem virar treino do dia, não).
  zoneLoad: ZoneLoadResult | null;
  // null quando não há RPE suficiente (pelo menos 1 no recente e 1 no
  // baseline) pra comparar.
  rpeTrend: RpeTrendResult | null;
}

// Limiar de queda de eficiência cardíaca pra soar o alerta — mesma cadência
// pedindo X% mais FC que na semana anterior é sinal clássico de fadiga
// acumulada/desacoplamento aeróbico.
const CARDIAC_EFFICIENCY_DROP_THRESHOLD = 0.08;

// Salto de 50%+ no tempo em zona intensa (Z4+Z5) de uma semana pra outra —
// gatilho mais comum de overtraining segundo a literatura, mesmo quando o
// volume total (ACWR) ainda está dentro da faixa normal.
const ZONE_INTENSO_SPIKE_THRESHOLD = 0.5;

// RPE recente (últimos 7 dias) vs. baseline (as ~3 semanas antes disso) —
// janelas que não se sobrepõem, pra comparar "como o aluno está se sentindo
// agora" com "como vinha se sentindo antes".
const RPE_RECENT_DAYS = 7;
const RPE_BASELINE_DAYS = 21;
// RPE subiu pelo menos 1.5 ponto (escala 0-10) acima do baseline — sinal
// subjetivo forte o bastante pra valer como apoio ao alerta objetivo.
const RPE_RISING_THRESHOLD = 1.5;

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

  // Segundos em cada zona de FC por semana — só sessões com amostras ponto a
  // ponto (.FIT ou streams da Strava anexados ao treino do dia) alimentam
  // isso; a amostra bruta nunca sai daqui nem vai pro `CompletedSession`
  // (o mesmo problema de payload de Server Action já resolvido antes no
  // dashboard do aluno se aplicaria aqui também).
  const weeklyZoneSeconds = new Map<string, { z1: number; z2: number; z3: number; z4: number; z5: number }>();

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
      avgCadence: row.atividade_fit?.avgCadence ?? null,
      avgHeartRate: row.atividade_fit?.avgHeartRate ?? null,
    });

    const samples = row.atividade_fit?.samples;
    if (samples && samples.length > 1 && hrMax != null && hrRest != null) {
      const zoneSeconds = computeZoneSeconds(samples, hrRest, hrMax);
      const week = isoWeekStart(row.data);
      const entry = weeklyZoneSeconds.get(week) ?? { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
      entry.z1 += zoneSeconds.z1;
      entry.z2 += zoneSeconds.z2;
      entry.z3 += zoneSeconds.z3;
      entry.z4 += zoneSeconds.z4;
      entry.z5 += zoneSeconds.z5;
      weeklyZoneSeconds.set(week, entry);
    }
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
      // strava_activities não guarda cadência (só o resumo básico) — só
      // fica disponível quando a atividade vira treino do dia, acima.
      avgCadence: null,
      avgHeartRate: activity.average_heartrate,
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
  function acwrAtOffset(offsetDays: number): { ratio: number; acuteLoad: number; chronicWeeklyAvg: number } | null {
    let acuteLoad = 0;
    for (let i = offsetDays; i < offsetDays + ACWR_ACUTE_DAYS; i++) acuteLoad += dailyLoad.get(isoDateDaysAgo(i)) ?? 0;

    let chronicSum = 0;
    for (let i = offsetDays; i < offsetDays + ACWR_CHRONIC_DAYS; i++) chronicSum += dailyLoad.get(isoDateDaysAgo(i)) ?? 0;
    const chronicWeeklyAvg = chronicSum / (ACWR_CHRONIC_DAYS / 7);

    if (chronicWeeklyAvg <= 0) return null;
    return { ratio: acuteLoad / chronicWeeklyAvg, acuteLoad, chronicWeeklyAvg };
  }

  let acwr: AcwrResult | null = null;
  if (loadMetric) {
    const todayAcwr = acwrAtOffset(0);
    if (todayAcwr) {
      const history: AcwrHistoryPoint[] = [];
      for (let offset = ACWR_HISTORY_DAYS - 1; offset >= 0; offset--) {
        const point = acwrAtOffset(offset);
        if (point) history.push({ dateIso: isoDateDaysAgo(offset), ratio: point.ratio });
      }
      acwr = { ...todayAcwr, metric: loadMetric, history };
    }
  }

  // Eficiência cardíaca (cadência/FC) — desacoplamento aeróbico entre
  // semanas: se a mesma cadência passa a exigir uma FC mais alta, a razão
  // cai, sinal clássico de fadiga acumulada mesmo com volume/carga
  // estáveis (o ACWR sozinho não pega isso).
  const efficiencyWeeklySum = new Map<string, { sum: number; count: number }>();
  for (const session of sessions) {
    if (session.avgCadence == null || session.avgHeartRate == null || session.avgHeartRate === 0) continue;
    const week = isoWeekStart(session.dateIso);
    const entry = efficiencyWeeklySum.get(week) ?? { sum: 0, count: 0 };
    entry.sum += session.avgCadence / session.avgHeartRate;
    entry.count += 1;
    efficiencyWeeklySum.set(week, entry);
  }
  const efficiencyPoints = [...efficiencyWeeklySum.entries()]
    .map(([weekStartIso, { sum, count }]) => ({ weekStartIso, value: sum / count }))
    .sort((a, b) => a.weekStartIso.localeCompare(b.weekStartIso));

  let cardiacEfficiency: CardiacEfficiencyResult | null = null;
  if (efficiencyPoints.length >= 2) {
    const [previous, current] = efficiencyPoints.slice(-2);
    const pctChange = previous.value > 0 ? ((current.value - previous.value) / previous.value) * 100 : 0;
    cardiacEfficiency = {
      points: efficiencyPoints,
      pctChange,
      declining: previous.value > 0 && (previous.value - current.value) / previous.value >= CARDIAC_EFFICIENCY_DROP_THRESHOLD,
    };
  }

  // Tempo em zona de FC por semana (Z1-Z5 agregados em leve/moderado/
  // intenso) — cruza com o ACWR: um salto de intenso sem o volume total
  // ter mudado muito é o gatilho mais comum de overtraining.
  const zoneWeeks: WeeklyZoneMinutes[] = [...weeklyZoneSeconds.entries()]
    .map(([weekStartIso, z]) => ({
      weekStartIso,
      leve: (z.z1 + z.z2) / 60,
      moderado: z.z3 / 60,
      intenso: (z.z4 + z.z5) / 60,
    }))
    .sort((a, b) => a.weekStartIso.localeCompare(b.weekStartIso));

  let zoneLoad: ZoneLoadResult | null = null;
  if (zoneWeeks.length > 0) {
    let intensoSpike = false;
    let intensoPctChange: number | null = null;
    if (zoneWeeks.length >= 2) {
      const [previous, current] = zoneWeeks.slice(-2);
      if (previous.intenso > 0) {
        intensoPctChange = ((current.intenso - previous.intenso) / previous.intenso) * 100;
        intensoSpike = intensoPctChange / 100 >= ZONE_INTENSO_SPIKE_THRESHOLD;
      } else if (current.intenso > 0) {
        // Não tinha zona intensa nenhuma na semana anterior e apareceu
        // agora — não dá pra calcular %, mas o salto absoluto já é o sinal.
        intensoSpike = true;
      }
    }
    zoneLoad = { weeks: zoneWeeks, intensoSpike, intensoPctChange };
  }

  // RPE recente (últimos 7 dias) vs. baseline (3 semanas antes disso) — sinal
  // subjetivo do aluno, cruzado com o que o ACWR/eficiência cardíaca dizem.
  const recentRpeValues: number[] = [];
  const baselineRpeValues: number[] = [];
  for (const session of sessions) {
    if (session.rpe == null) continue;
    const daysAgo = Math.floor((Date.now() - new Date(`${session.dateIso}T00:00:00Z`).getTime()) / (24 * 60 * 60 * 1000));
    if (daysAgo < 0) continue;
    if (daysAgo < RPE_RECENT_DAYS) recentRpeValues.push(session.rpe);
    else if (daysAgo < RPE_RECENT_DAYS + RPE_BASELINE_DAYS) baselineRpeValues.push(session.rpe);
  }

  let rpeTrend: RpeTrendResult | null = null;
  if (recentRpeValues.length > 0 && baselineRpeValues.length > 0) {
    const recentAvg = recentRpeValues.reduce((a, b) => a + b, 0) / recentRpeValues.length;
    const baselineAvg = baselineRpeValues.reduce((a, b) => a + b, 0) / baselineRpeValues.length;
    rpeTrend = { recentAvg, baselineAvg, rising: recentAvg - baselineAvg >= RPE_RISING_THRESHOLD };
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
    cardiacEfficiency,
    zoneLoad,
    rpeTrend,
  };
}
