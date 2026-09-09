import { formatDistance, formatDuration } from "./workout-metrics";
import type { MockWorkoutDetail } from "./mock-data";

/** Monta um link wa.me com o texto já preenchido (URL-encoded). */
export function buildWhatsAppLink(phone: string, text: string): string {
  const digitsOnly = phone.replace(/\D/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(text)}`;
}

/** Texto formatado do treino do dia, enviado pelo treinador ao aluno. */
export function buildWorkoutWhatsAppMessage(workout: MockWorkoutDetail): string {
  const lines = [
    `*Treino de hoje — ${workout.title}*`,
    `${workout.discipline} · ${workout.scheduledDateLabel}`,
    "",
    `🔥 Aquecimento: ${workout.prescription.warmup}`,
    `💪 Parte principal: ${workout.prescription.mainSet}`,
    `🧊 Desaquecimento: ${workout.prescription.cooldown}`,
    "",
    `Duração prevista: ${formatDuration(workout.planned.durationSeconds)}`,
    `Distância prevista: ${formatDistance(workout.planned.distanceMeters)}`,
  ];

  if (workout.prescription.videoUrl) {
    lines.push("", `Vídeo/preleção: ${workout.prescription.videoUrl}`);
  }

  return lines.join("\n");
}
