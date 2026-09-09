import { Card, CardTitle } from "@/components/ui/Card";
import { FEELING_EMOJIS, RPE_LABELS } from "@/lib/workout-metrics";
import type { MockWorkoutDetail } from "@/lib/mock-data";

interface SubjectiveFeedbackProps {
  completed: MockWorkoutDetail["completed"];
}

// Percepção subjetiva do atleta pós-treino: RPE, sensação (emoji) e
// comentários livres.
export function SubjectiveFeedback({ completed }: SubjectiveFeedbackProps) {
  if (!completed) {
    return (
      <Card>
        <CardTitle>Como você se sentiu</CardTitle>
        <p className="mt-2 text-sm text-g4-muted">
          Ainda sem lançamento. Assim que o treino for concluído, o RPE e a sensação aparecem aqui.
        </p>
      </Card>
    );
  }

  const feeling = completed.feeling ? FEELING_EMOJIS[completed.feeling] : null;

  return (
    <Card>
      <CardTitle>Como você se sentiu</CardTitle>

      <div className="mt-3 flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs text-g4-muted">RPE</p>
          <p className="text-lg font-semibold text-g4-ink">
            {completed.rpe ?? "—"}
            {completed.rpe && (
              <span className="ml-1.5 text-sm font-normal text-g4-muted">
                {RPE_LABELS[completed.rpe]}
              </span>
            )}
          </p>
        </div>

        <div>
          <p className="text-xs text-g4-muted">Sensação</p>
          <p className="text-lg font-semibold text-g4-ink">
            {feeling ? (
              <>
                <span className="mr-1.5 text-xl" aria-hidden>
                  {feeling.emoji}
                </span>
                <span className="text-sm font-normal text-g4-muted">{feeling.label}</span>
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      {completed.comments && (
        <div className="mt-4 rounded-xl bg-g4-surface-alt p-3">
          <p className="text-xs font-semibold text-g4-muted">Comentário do atleta</p>
          <p className="mt-1 text-sm text-g4-ink">{completed.comments}</p>
        </div>
      )}
    </Card>
  );
}
