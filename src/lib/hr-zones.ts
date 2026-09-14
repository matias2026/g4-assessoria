// Zonas de FC por %reserva cardíaca (Karvonen: (FC - FCrep) / (FCmáx -
// FCrep)) — mesma base do TRIMP (src/lib/trimp.ts), reaproveitada aqui pra
// classificar cada amostra de FC de uma atividade numa zona de 1 a 5.
export type HrZone = 1 | 2 | 3 | 4 | 5;

export function classifyHrZone(heartRate: number, hrRest: number, hrMax: number): HrZone {
  if (hrMax <= hrRest) return 1;
  const hrr = (heartRate - hrRest) / (hrMax - hrRest);
  if (hrr < 0.6) return 1;
  if (hrr < 0.7) return 2;
  if (hrr < 0.8) return 3;
  if (hrr < 0.9) return 4;
  return 5;
}

// Limites de %HRR por zona — mesmos limiares de classifyHrZone, só na
// direção contrária (zona conhecida → faixa de bpm, não bpm → zona). Z5 não
// tem teto natural na classificação (qualquer coisa >= 90% HRR); aqui usa
// 100% (= FC máx) como teto pra virar um intervalo fechado.
const ZONE_HRR_BOUNDS: Record<HrZone, readonly [number, number]> = {
  1: [0, 0.6],
  2: [0.6, 0.7],
  3: [0.7, 0.8],
  4: [0.8, 0.9],
  5: [0.9, 1],
};

export interface HrZoneRange {
  low: number;
  high: number;
}

/**
 * Faixa de bpm de uma zona (1-5), calculada a partir da FC máx/repouso do
 * aluno — o inverso de classifyHrZone. Usada pra prescrever um bloco de
 * treino por zona (o treinador escolhe "Z4", o app mostra/exporta o bpm
 * correspondente a esse aluno específico) em vez de bpm digitado à mão.
 * null quando a ficha não tem FC máx/repouso cadastrada (nunca inventa um
 * valor padrão pra preencher a lacuna).
 */
export function hrZoneRange(zone: HrZone, hrRest: number | null, hrMax: number | null): HrZoneRange | null {
  if (hrRest == null || hrMax == null || hrMax <= hrRest) return null;
  const [lowHrr, highHrr] = ZONE_HRR_BOUNDS[zone];
  const reserve = hrMax - hrRest;
  return {
    low: Math.round(hrRest + lowHrr * reserve),
    high: Math.round(hrRest + highHrr * reserve),
  };
}

export interface ZoneSeconds {
  z1: number;
  z2: number;
  z3: number;
  z4: number;
  z5: number;
}

/**
 * Segundos passados em cada zona de FC ao longo de uma sessão, a partir das
 * amostras de série temporal (.FIT ponto a ponto, ou streams "medium" da
 * Strava). O intervalo entre duas amostras conta pra zona da amostra
 * inicial — aproximação padrão quando o intervalo não é sempre igual (caso
 * dos streams da Strava, diferente do .FIT que é sempre 1 amostra/segundo).
 */
export function computeZoneSeconds(
  samples: { timestamp: number; heartRate: number }[],
  hrRest: number,
  hrMax: number
): ZoneSeconds {
  const zones: ZoneSeconds = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  const key = (zone: HrZone): keyof ZoneSeconds => `z${zone}` as keyof ZoneSeconds;
  for (let i = 0; i < samples.length - 1; i++) {
    const delta = samples[i + 1].timestamp - samples[i].timestamp;
    if (delta <= 0 || !samples[i].heartRate) continue;
    const zone = classifyHrZone(samples[i].heartRate, hrRest, hrMax);
    zones[key(zone)] += delta;
  }
  return zones;
}
