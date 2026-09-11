// Formatting of workout metrics in the TrainingPeaks style (Duration, TSS,
// IF, Pace/Speed, HR). Pace/speed is always derived from distance +
// duration — it isn't stored, to avoid duplicated data.

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
 * Raw pace (sec/km, running) or average speed (km/h, cycling) value —
 * split out from formatPaceOrSpeed so it can be compared numerically
 * (see compareToPlanned) in addition to being displayed.
 */
export function paceOrSpeedValue(
  discipline: string,
  distanceMeters: number | null | undefined,
  durationSeconds: number | null | undefined
): number | null {
  if (!distanceMeters || !durationSeconds) return null;

  const normalized = discipline.toLowerCase();

  if (normalized.includes("corrida")) return durationSeconds / (distanceMeters / 1000);
  if (normalized.includes("ciclismo")) return distanceMeters / 1000 / (durationSeconds / 3600);

  return null;
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
  const raw = paceOrSpeedValue(discipline, distanceMeters, durationSeconds);
  if (raw == null) return "—";

  const normalized = discipline.toLowerCase();

  if (normalized.includes("corrida")) {
    const min = Math.floor(raw / 60);
    const sec = Math.round(raw % 60);
    return `${min}:${String(sec).padStart(2, "0")} /km`;
  }

  if (normalized.includes("ciclismo")) return `${raw.toFixed(1)} km/h`;

  return "—";
}

export type PlanComparison = "match" | "off" | "none";

const DEFAULT_TOLERANCE_PCT = 10;

/**
 * Compara um valor concluído contra o planejado dentro de uma tolerância —
 * "match" (dentro do esperado, exibido em azul), "off" (fora do esperado,
 * vermelho) ou "none" (falta dado suficiente, ex.: treino ainda não
 * concluído — cor neutra).
 */
export function compareToPlanned(
  planned: number | null | undefined,
  completed: number | null | undefined,
  tolerancePct = DEFAULT_TOLERANCE_PCT
): PlanComparison {
  if (planned == null || completed == null) return "none";
  if (planned === 0) return completed === 0 ? "match" : "off";

  const deviation = Math.abs(completed - planned) / Math.abs(planned);
  return deviation <= tolerancePct / 100 ? "match" : "off";
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
