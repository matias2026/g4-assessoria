// Formatação de métricas de treino no padrão TrainingPeaks (Duração, TSS,
// IF, Ritmo/Velocidade, FC). Ritmo/velocidade é sempre derivado de
// distância + duração — não é armazenado, para não haver dado duplicado.

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return "—";
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—";
  return value.toFixed(digits);
}

export function formatHeartRate(bpm: number | null | undefined): string {
  if (bpm == null) return "—";
  return `${Math.round(bpm)} bpm`;
}

/**
 * Ritmo (corrida, min/km) ou velocidade média (ciclismo, km/h), calculado a
 * partir de distância e duração. Retorna "—" quando a modalidade não usa
 * essa métrica (ex.: academia) ou faltam dados.
 */
export function formatPaceOrSpeed(
  discipline: string,
  distanceMeters: number | null | undefined,
  durationSeconds: number | null | undefined
): string {
  if (!distanceMeters || !durationSeconds) return "—";

  const normalized = discipline.toLowerCase();

  if (normalized.includes("corrida")) {
    const secondsPerKm = durationSeconds / (distanceMeters / 1000);
    const min = Math.floor(secondsPerKm / 60);
    const sec = Math.round(secondsPerKm % 60);
    return `${min}:${String(sec).padStart(2, "0")} /km`;
  }

  if (normalized.includes("ciclismo")) {
    const kmh = distanceMeters / 1000 / (durationSeconds / 3600);
    return `${kmh.toFixed(1)} km/h`;
  }

  return "—";
}

export const RPE_LABELS: Record<number, string> = {
  1: "Muito leve",
  2: "Leve",
  3: "Leve",
  4: "Moderado",
  5: "Moderado",
  6: "Um pouco forte",
  7: "Forte",
  8: "Forte",
  9: "Muito forte",
  10: "Máximo",
};

export const FEELING_EMOJIS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: "😞", label: "Muito ruim" },
  2: { emoji: "🙁", label: "Ruim" },
  3: { emoji: "😐", label: "Neutro" },
  4: { emoji: "🙂", label: "Bom" },
  5: { emoji: "😄", label: "Ótimo" },
};
