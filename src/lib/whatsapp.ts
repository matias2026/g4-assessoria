import { buildHrZoneTableLines } from "./hr-zones";
import { formatDistance, formatDuration } from "./workout-metrics";
import type { MockWorkoutDetail } from "./mock-data";

/** Monta um link wa.me com o texto já preenchido (URL-encoded). */
export function buildWhatsAppLink(phone: string, text: string): string {
  const digitsOnly = phone.replace(/\D/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(text)}`;
}

/**
 * Texto formatado do treino do dia, enviado pelo treinador ao aluno. A
 * tabela de zonas de FC é calculada aqui (hrRest/hrMax do aluno) em vez de
 * vir digitada à mão na descrição — evita erro de digitação e fica sempre
 * atualizada com a FC máx/repouso cadastrada na ficha.
 */
export function buildWorkoutWhatsAppMessage(
  workout: MockWorkoutDetail,
  hrRest: number | null = null,
  hrMax: number | null = null
): string {
  const zoneLines = buildHrZoneTableLines(hrRest, hrMax);

  const lines = [
    `*Treino de hoje — ${workout.title}*`,
    `${workout.discipline} · ${workout.scheduledDateLabel}`,
    workout.description,
  ];

  if (zoneLines) {
    lines.push("", "*Zona de batimentos:*", ...zoneLines);
  }

  lines.push(
    "",
    `🔥 Aquecimento: ${workout.prescription.warmup}`,
    "",
    `💪 Parte principal: ${workout.prescription.mainSet}`,
    "",
    `🧊 Desaquecimento: ${workout.prescription.cooldown}`,
    "",
    `Duração prevista: ${formatDuration(workout.planned.durationSeconds)}`,
    `Distância prevista: ${formatDistance(workout.planned.distanceMeters)}`
  );

  if (workout.prescription.videoUrl) {
    lines.push("", `Vídeo/preleção: ${workout.prescription.videoUrl}`);
  }

  if (workout.trainingSessions.length > 0) {
    lines.push("");
    for (const session of workout.trainingSessions) {
      lines.push(`*${session.name}*`);
      for (const exercise of session.exercises) {
        const setsSummary = exercise.sets
          .map((set) => `${set.reps} (${set.load}, ${set.restSeconds}s)`)
          .join(", ");
        lines.push(`- ${exercise.name}: ${setsSummary}`);
        if (exercise.videoUrl) {
          lines.push(`  Vídeo: ${exercise.videoUrl}`);
        }
      }
    }
  }

  return lines.join("\n");
}
