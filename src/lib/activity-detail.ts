// Dados de uma atividade registrada (GPS/ciclocomputador), no padrão
// Intervals.icu: resumo consolidado + amostras de série temporal para os
// gráficos sincronizados. Mock por enquanto — a importação real por
// amostra (FIT/Strava) ainda não existe, só o resumo agregado usado em
// `mockWorkoutDetails` (ver mock-data.ts).

export interface ActivitySample {
  timestamp: number; // segundos desde o início da atividade
  distanceMeters: number;
  cadence: number; // rpm
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

// PRNG determinístico (sem dependência externa) — mesma atividade de
// exemplo toda vez, para as amostras não mudarem a cada reload.
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Gera uma atividade de exemplo (perfil de cadência com pausas de
 * pedalada e altimetria ondulada) com uma amostra a cada 5s, para
 * demonstrar os gráficos sincronizados sem depender de importação real.
 */
export function buildMockActivityDetail(): ActivityDetail {
  const durationSeconds = 56 * 60 + 55;
  const sampleIntervalSeconds = 5;
  const random = seededRandom(42);

  const samples: ActivitySample[] = [];
  let distanceMeters = 0;

  for (let t = 0; t <= durationSeconds; t += sampleIntervalSeconds) {
    const pedaling = random() > 0.12;
    const cadence = pedaling ? Math.round(75 + Math.sin(t / 40) * 12 + (random() - 0.5) * 10) : 0;
    const altitudeMeters = Math.round(55 + Math.sin(t / 260) * 22 + Math.sin(t / 55) * 8 + (random() - 0.5) * 2);
    const speedKmh = pedaling ? 20 + Math.sin(t / 90) * 6 + (random() - 0.5) * 3 : 2;
    distanceMeters += (speedKmh / 3600) * sampleIntervalSeconds * 1000;

    samples.push({
      timestamp: t,
      distanceMeters: Math.round(distanceMeters),
      cadence: Math.max(0, cadence),
      altitudeMeters,
      heartRate: Math.round(128 + Math.sin(t / 180) * 14 + (random() - 0.5) * 6),
      speedKmh: Math.round(speedKmh * 10) / 10,
    });
  }

  return {
    id: "activity-1",
    athleteName: "Carlos Silva",
    date: "sáb. 22 ago. 2026",
    startTime: "06:16 PM",
    type: "Ciclismo ao Ar Livre",
    distanceKm: 23.49,
    durationSeconds,
    avgSpeedKmh: 24.5,
    elevationGainMeters: 241,
    avgCadence: 70,
    calories: 742,
    weightKg: 69,
    samples,
  };
}
