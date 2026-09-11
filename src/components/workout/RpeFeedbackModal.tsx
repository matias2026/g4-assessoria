"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { FEELING_EMOJIS, RPE_LABELS } from "@/lib/workout-metrics";

export interface RpeFeedback {
  rpe: number;
  feeling: number;
  comments: string;
}

interface RpeFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (feedback: RpeFeedback) => void;
}

const RPE_SCALE = Array.from({ length: 10 }, (_, i) => i + 1);
const FEELING_SCALE = [1, 2, 3, 4, 5];

/**
 * Modal de feedback pós-treino: aberto ao clicar em "Marcar como concluído".
 * Registra RPE (1-10), sensação (emoji, 1-5) e observações — tudo em estado
 * local, repassado ao chamador via onSubmit. TODO: persistir em
 * workout_completions via Supabase quando o projeto estiver conectado.
 */
export function RpeFeedbackModal({ open, onClose, onSubmit }: RpeFeedbackModalProps) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [feeling, setFeeling] = useState<number | null>(null);
  const [comments, setComments] = useState("");

  if (!open) return null;

  function handleSubmit() {
    if (rpe == null || feeling == null) return;
    onSubmit({ rpe, feeling, comments: comments.trim() });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Feedback pós-treino"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-g4-surface p-5 shadow-lg sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-g4-ink">Como foi o treino?</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg px-2 py-1 text-g4-muted hover:bg-g4-surface-alt"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-g4-muted">
          Seu treinador vê essa percepção de esforço junto com os dados do treino.
        </p>

        <div className="mt-4">
          <p className="text-sm font-medium text-g4-ink">Percepção de esforço (RPE)</p>
          <div className="mt-2 grid grid-cols-5 gap-4">
            {RPE_SCALE.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRpe(value)}
                className={cn(
                  "rounded-xl border py-2 text-sm font-semibold transition-colors focus-ring",
                  rpe === value
                    ? "border-lime bg-lime text-g4-ink"
                    : "border-g4-border bg-white text-g4-ink hover:border-lime-deep/50 hover:bg-g4-surface-alt"
                )}
              >
                {value}
              </button>
            ))}
          </div>
          {rpe != null && <p className="mt-1.5 text-xs text-g4-muted">{RPE_LABELS[rpe]}</p>}
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-g4-ink">Sensação geral</p>
          <div className="mt-2 flex justify-between gap-4">
            {FEELING_SCALE.map((value) => {
              const { emoji, label } = FEELING_EMOJIS[value];
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFeeling(value)}
                  aria-label={label}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-4 rounded-xl border py-2 transition-colors focus-ring",
                    feeling === value
                      ? "border-lime bg-lime/15"
                      : "border-g4-border bg-white hover:border-lime-deep/50 hover:bg-g4-surface-alt"
                  )}
                >
                  <span className="text-xl" aria-hidden>
                    {emoji}
                  </span>
                </button>
              );
            })}
          </div>
          {feeling != null && (
            <p className="mt-1.5 text-xs text-g4-muted">{FEELING_EMOJIS[feeling].label}</p>
          )}
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-g4-ink">Observações (opcional)</span>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            placeholder="Como se sentiu, alguma dor ou dificuldade..."
            className="mt-1 w-full resize-none rounded-xl border border-g4-border bg-white p-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        <Button
          variant="primary"
          className="mt-5 w-full"
          onClick={handleSubmit}
          disabled={rpe == null || feeling == null}
        >
          Enviar feedback
        </Button>
      </div>
    </div>
  );
}
