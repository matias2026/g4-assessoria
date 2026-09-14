import type { StravaStreamSet, StravaSummaryActivity } from "./types";
import type { UploadedActivity } from "@/lib/supabase/types";

const MPS_TO_KMH = 3.6;

function average(values: number[] | undefined): number | null {
  if (!values || values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function max(values: number[] | undefined): number | null {
  if (!values || values.length === 0) return null;
  return Math.max(...values);
}

// Soma só os ganhos (diferenças positivas) entre pontos consecutivos de
// altitude — jeito padrão de estimar altimetria acumulada a partir de uma
// série de altitude, mesma ideia que os relógios/computadores de bordo usam.
function totalAscent(altitude: number[] | undefined): number | null {
  if (!altitude || altitude.length < 2) return null;
  let ascent = 0;
  for (let i = 1; i < altitude.length; i++) {
    const delta = altitude[i] - altitude[i - 1];
    if (delta > 0) ascent += delta;
  }
  return Math.round(ascent);
}

/**
 * Converte o resumo + streams de uma atividade do Strava pro mesmo formato
 * de src/lib/fit-import.ts — dá pra reaproveitar todos os gráficos de
 * "Analisar treino do aluno" (ActivityDetailView etc.) sem precisar de um
 * caminho de renderização separado pra atividade sincronizada via Strava.
 */
export function buildUploadedActivityFromStrava(
  activity: StravaSummaryActivity,
  streams: StravaStreamSet,
  relativeEffort: number | null = null
): UploadedActivity {
  const times = streams.time ?? [];
  const samples = times.map((t, i) => ({
    timestamp: t,
    distanceMeters: streams.distance?.[i] ?? 0,
    cadence: streams.cadence?.[i] ?? 0,
    power: streams.watts?.[i] ?? 0,
    altitudeMeters: streams.altitude?.[i] ?? 0,
    heartRate: streams.heartrate?.[i] ?? 0,
    speedKmh: streams.velocity_smooth?.[i] != null ? Math.round(streams.velocity_smooth[i] * MPS_TO_KMH * 10) / 10 : 0,
  }));

  return {
    source: "strava",
    startedAt: activity.start_date,
    durationSeconds: activity.moving_time,
    distanceMeters: activity.distance,
    avgSpeedKmh:
      activity.moving_time > 0 ? Math.round((activity.distance / activity.moving_time) * MPS_TO_KMH * 10) / 10 : null,
    elevationGainMeters: totalAscent(streams.altitude),
    avgCadence: average(streams.cadence),
    avgHeartRate: activity.average_heartrate ?? average(streams.heartrate),
    maxHeartRate: max(streams.heartrate),
    avgPower: average(streams.watts),
    maxPower: max(streams.watts),
    calories: null,
    relativeEffort,
    samples,
  };
}
