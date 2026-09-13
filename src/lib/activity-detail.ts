// Dados de uma atividade registrada (GPS/ciclocomputador), no padrão
// Intervals.icu: resumo consolidado + amostras de série temporal para os
// gráficos sincronizados. buildActivityDetailFromUpload converte o que
// foi decodificado de um .FIT enviado pelo aluno (fit-import.ts) pro
// formato que ActivityDetailView/ActivitySyncedCharts esperam.

import type { UploadedActivity } from "./supabase/types";

export interface ActivitySample {
  timestamp: number; // segundos desde o início da atividade
  distanceMeters: number;
  cadence: number; // rpm
  power: number; // watts
  altitudeMeters: number;
  heartRate: number; // bpm
  speedKmh: number;
}

export type ActivityType = "Ciclismo ao Ar Livre" | "Corrida ao Ar Livre" | "Academia";

export interface ActivityDetail {
  id: string;
  athleteName: string;
  date: string;
  startTime: string;
  type: ActivityType;
  distanceKm: number;
  durationSeconds: number;
  avgSpeedKmh: number;
  elevationGainMeters: number;
  avgCadence: number;
  calories: number;
  weightKg: number;
  samples: ActivitySample[];
}

function activityTypeForDiscipline(discipline: string): ActivityType {
  if (discipline === "Corrida") return "Corrida ao Ar Livre";
  if (discipline === "Academia") return "Academia";
  return "Ciclismo ao Ar Livre";
}

/**
 * Converte o resumo+amostras decodificados de um .FIT enviado pelo aluno
 * (ver fit-import.ts, salvo em treinos.atividade_fit) pro mesmo formato
 * que ActivityDetailView já sabe renderizar.
 */
export function buildActivityDetailFromUpload(
  uploaded: UploadedActivity,
  context: { athleteName: string; discipline: string; weightKg: number | null }
): ActivityDetail {
  const startedAt = uploaded.startedAt ? new Date(uploaded.startedAt) : null;
  const cadenceSamples = uploaded.samples.map((s) => s.cadence).filter((c) => c > 0);
  const avgCadenceFromSamples = cadenceSamples.length
    ? Math.round(cadenceSamples.reduce((a, b) => a + b, 0) / cadenceSamples.length)
    : 0;

  return {
    id: `upload-${uploaded.startedAt ?? "sem-data"}`,
    athleteName: context.athleteName,
    date: startedAt
      ? startedAt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
      : "",
    startTime: startedAt ? startedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
    type: activityTypeForDiscipline(context.discipline),
    distanceKm: uploaded.distanceMeters != null ? uploaded.distanceMeters / 1000 : 0,
    durationSeconds: uploaded.durationSeconds ?? 0,
    avgSpeedKmh: uploaded.avgSpeedKmh ?? 0,
    elevationGainMeters: uploaded.elevationGainMeters != null ? Math.round(uploaded.elevationGainMeters) : 0,
    avgCadence: uploaded.avgCadence ?? avgCadenceFromSamples,
    calories: uploaded.calories ?? 0,
    weightKg: context.weightKg ?? 0,
    samples: uploaded.samples,
  };
}
