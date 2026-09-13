"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCoachOrAdmin } from "./actions";

// Janela de 6 semanas: dá pra ver uma tendência de carga sem carregar o
// histórico inteiro do aluno a cada troca de seleção no Monitoramento.
const WINDOW_DAYS = 42;

export type CompletedSessionSource = "fit" | "strava" | "rpe";

export interface CompletedSession {
  dateIso: string;
  source: CompletedSessionSource;
  distanceMeters: number | null;
  durationSeconds: number | null;
  tss: number | null;
  rpe: number | null;
}

// A maioria dos .FIT enviados não vem de um head unit com medidor de
// potência configurado, então `tss_real` normalmente fica null mesmo num
// treino real e completo (caso real: Ericlis subiu 29km de ciclismo sem
// TSS no arquivo). "tss" é usado quando existe pelo menos uma sessão com
// TSS; senão cai pra "minutes" (duração), que todo .FIT/Strava sempre tem.
export type LoadMetric = "tss" | "minutes";

export interface WeeklyLoad {
  weekStartIso: string;
  value: number; // TSS somado, ou minutos somados — ver `loadMetric`
}

export interface MonitoringSummary {
  sessions: CompletedSession[];
  totalCount: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  avgRpe: number | null;
  weeklyLoad: WeeklyLoad[];
  // null só quando não há nenhum dado de carga possível (nem TSS, nem
  // duração) — aí weeklyLoad vem sempre vazio.
  loadMetric: LoadMetric | null;
}

// Segunda-feira (UTC) da semana ISO de uma data "YYYY-MM-DD".
function isoWeekStart(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d.toISOString().slice(0, 10);
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

  const [treinoResult, stravaRows] = await Promise.all([
    admin
      .from("treinos")
      .select("data, distancia_real, tss_real, rpe_esforco, atividade_fit")
      .eq("aluno_id", studentId)
      .eq("concluido", true)
      .gte("data", sinceDateIso),
    userId
      ? admin
          .from("strava_activities")
          .select("start_date, distance_meters, moving_time_seconds")
          .eq("profile_id", userId)
          .gte("start_date", since.toISOString())
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
  ]);

  if (treinoResult.error) {
    console.error("[cockpit] erro ao buscar treinos concluídos p/ monitoramento:", treinoResult.error.message);
  }

  const sessions: CompletedSession[] = [];
  const treinoDates = new Set<string>();

  for (const row of treinoResult.data ?? []) {
    treinoDates.add(row.data);
    sessions.push({
      dateIso: row.data,
      source: row.atividade_fit?.source === "strava" ? "strava" : row.atividade_fit ? "fit" : "rpe",
      distanceMeters: row.distancia_real ?? row.atividade_fit?.distanceMeters ?? null,
      durationSeconds: row.atividade_fit?.durationSeconds ?? null,
      tss: row.tss_real,
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
      // Strava só devolve TSS/IF com um FTP calibrado na própria conta do
      // atleta lá — não temos isso aqui, então fica de fora do card de
      // evolução em vez de estimar um número que pareceria real.
      tss: null,
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
    : sessions.some((s) => s.durationSeconds != null)
      ? "minutes"
      : null;

  const weeklyMap = new Map<string, number>();
  if (loadMetric) {
    for (const session of sessions) {
      const raw = loadMetric === "tss" ? session.tss : session.durationSeconds != null ? session.durationSeconds / 60 : null;
      if (raw == null) continue;
      const week = isoWeekStart(session.dateIso);
      weeklyMap.set(week, (weeklyMap.get(week) ?? 0) + raw);
    }
  }
  const weeklyLoad = [...weeklyMap.entries()]
    .map(([weekStartIso, value]) => ({ weekStartIso, value }))
    .sort((a, b) => a.weekStartIso.localeCompare(b.weekStartIso));

  return {
    sessions,
    totalCount: sessions.length,
    totalDistanceMeters,
    totalDurationSeconds,
    avgRpe,
    weeklyLoad,
    loadMetric,
  };
}
