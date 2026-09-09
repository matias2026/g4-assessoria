"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import type { FeedbackDraftInput } from "@/lib/ai/gemini";

interface AiFeedbackComposerProps {
  draftInput: FeedbackDraftInput;
  initialValue: string;
}

// Composer do treinador: gera um rascunho com IA (Gemini), permite editar
// e "enviar" — o texto final é o que aparece como Feedback do Professor
// para o atleta. TODO: persistir em workout_completions.coach_feedback via
// Supabase quando o projeto estiver conectado (hoje só atualiza a tela).
export function AiFeedbackComposer({ draftInput, initialValue }: AiFeedbackComposerProps) {
  const [text, setText] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateDraft() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/draft-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftInput),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Falha ao gerar rascunho.");
      }

      const { draft } = await response.json();
      setText(draft);
      setSent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar rascunho.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Feedback para o atleta</CardTitle>
        <Button variant="ghost" onClick={handleGenerateDraft} disabled={loading} className="px-3 text-xs">
          {loading ? "Gerando…" : "✨ Gerar rascunho com IA"}
        </Button>
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSent(false);
        }}
        rows={4}
        placeholder="Escreva o feedback ou gere um rascunho com IA para editar."
        className="mt-3 w-full resize-none rounded-xl border border-g4-border bg-white p-3 text-sm text-g4-ink focus-ring"
      />

      {error && <p className="mt-2 text-xs text-status-missed">{error}</p>}

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-g4-muted">
          O rascunho de IA é só o ponto de partida — revise antes de enviar.
        </p>
        <Button variant="primary" className="px-5" onClick={() => setSent(true)} disabled={!text.trim()}>
          {sent ? "Enviado ✓" : "Enviar ao atleta"}
        </Button>
      </div>
    </Card>
  );
}
