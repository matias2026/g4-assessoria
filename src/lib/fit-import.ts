import { Decoder, Stream } from "@garmin/fitsdk";
import type { UploadedActivity } from "./supabase/types";

export interface ParsedFitActivity {
  activity: UploadedActivity;
  durationLabel: string | null; // "H:MM:SS", pra treinos.duracao_real (coluna texto)
  trainingStressScore: number | null;
}

const MPS_TO_KMH = 3.6;

// Exportado — src/lib/strava/activity-import.ts usa o mesmo formato pro
// duracao_real de uma atividade sincronizada via Strava.
export function formatDurationLabel(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Decodifica um arquivo .FIT enviado pelo aluno (upload manual, ver
 * completeOwnWorkoutWithFit em profile-actions.ts) em resumo + amostras de
 * série temporal — mesmo formato usado pelos gráficos de
 * ActivityDetailView/ActivitySyncedCharts, com dado real.
 */
export function parseFitFile(bytes: ArrayBuffer): ParsedFitActivity {
  const stream = Stream.fromArrayBuffer(bytes);
  if (!Decoder.isFIT(stream)) {
    throw new Error("Esse arquivo não parece ser um .FIT válido.");
  }

  const decoder = new Decoder(stream);
  const { messages, errors } = decoder.read();
  if (errors.length > 0) {
    console.error(
      "[fit-import] erros ao decodificar .FIT:",
      errors.map((e) => e.message)
    );
  }

  const session = messages.sessionMesgs?.[0];
  const records = messages.recordMesgs ?? [];

  if (!session && records.length === 0) {
    throw new Error("Não encontramos dados de treino nesse arquivo .FIT.");
  }

  const firstTimestamp = records.find((r) => r.timestamp)?.timestamp;
  const startMs = firstTimestamp ? new Date(firstTimestamp).getTime() : null;

  const samples = records
    .filter((r) => r.timestamp)
    .map((r) => {
      const ms = new Date(r.timestamp as Date).getTime();
      return {
        timestamp: startMs != null ? Math.round((ms - startMs) / 1000) : 0,
        distanceMeters: r.distance ?? 0,
        cadence: r.cadence ?? 0,
        power: r.power ?? 0,
        altitudeMeters: r.altitude ?? 0,
        heartRate: r.heartRate ?? 0,
        speedKmh: r.speed != null ? Math.round(r.speed * MPS_TO_KMH * 10) / 10 : 0,
      };
    });

  const durationSeconds = session?.totalTimerTime ?? session?.totalElapsedTime ?? null;

  const activity: UploadedActivity = {
    source: "fit",
    startedAt: startMs != null ? new Date(startMs).toISOString() : null,
    durationSeconds: durationSeconds != null ? Math.round(durationSeconds) : null,
    distanceMeters: session?.totalDistance ?? null,
    avgSpeedKmh: session?.avgSpeed != null ? Math.round(session.avgSpeed * MPS_TO_KMH * 10) / 10 : null,
    elevationGainMeters: session?.totalAscent ?? null,
    avgCadence: session?.avgCadence ?? null,
    avgHeartRate: session?.avgHeartRate ?? null,
    maxHeartRate: session?.maxHeartRate ?? null,
    avgPower: session?.avgPower ?? null,
    maxPower: session?.maxPower ?? null,
    calories: session?.totalCalories ?? null,
    samples,
  };

  return {
    activity,
    durationLabel: activity.durationSeconds != null ? formatDurationLabel(activity.durationSeconds) : null,
    trainingStressScore: session?.trainingStressScore ?? null,
  };
}
