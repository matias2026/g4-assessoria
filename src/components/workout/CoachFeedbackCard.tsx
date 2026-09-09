import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { FEELING_EMOJIS, RPE_LABELS } from "@/lib/workout-metrics";
import type { MockWorkoutDetail } from "@/lib/mock-data";

interface CoachFeedbackCardProps {
  completed: MockWorkoutDetail["completed"];
  coachName: string;
}

/**
 * Feedback híbrido exibido ao atleta: a análise final é sempre do
 * treinador — o rascunho de IA (Gemini) só aparece como um selo indicando
 * apoio na redação, nunca como texto próprio exibido sozinho.
 */
export function CoachFeedbackCard({ completed, coachName }: CoachFeedbackCardProps) {
  if (!completed) {
    return (
      <Card>
        <CardTitle>Feedback do professor</CardTitle>
        <p className="mt-2 text-sm text-g4-muted">
          Assim que o treino for concluído e revisado, o feedback aparece aqui.
        </p>
      </Card>
    );
  }

  const feeling = completed.feeling ? FEELING_EMOJIS[completed.feeling] : null;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Feedback do professor</CardTitle>
        {completed.aiFeedbackDraft && <Badge tone="lime">✨ com apoio de IA</Badge>}
      </div>

      {completed.coachFeedback ? (
        <p className="mt-2 text-sm leading-relaxed text-g4-ink">{completed.coachFeedback}</p>
      ) : (
        <p className="mt-2 text-sm text-g4-muted">{coachName} ainda não deixou um comentário.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-g4-border pt-3">
        <div>
          <p className="text-xs text-g4-muted">Seu RPE</p>
          <p className="text-base font-semibold text-g4-ink">
            {completed.rpe ?? "—"}
            {completed.rpe && (
              <span className="ml-1.5 text-sm font-normal text-g4-muted">{RPE_LABELS[completed.rpe]}</span>
            )}
          </p>
        </div>

        <div>
          <p className="text-xs text-g4-muted">Sensação</p>
          <p className="text-base font-semibold text-g4-ink">
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
    </Card>
  );
}
