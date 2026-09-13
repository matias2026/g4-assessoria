"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { fieldClass } from "@/lib/student-profile-form";
import { updateAthleteReport } from "@/app/(athlete)/dashboard/profile-actions";

interface ReportsPanelProps {
  athleteReport: string;
  coachNotes: string;
  coachName: string;
}

/**
 * "Relatório" (o próprio aluno escreve, livre) + "Relatório do treinador"
 * (só leitura — o treinador escreve pela ficha dele no Cockpit). Duas
 * seções na mesma página porque são o par natural de "o que eu digo" /
 * "o que meu treinador diz", mas cada uma tem seu próprio id de âncora
 * (usado pelo menu hambúrguer) e é editada por um lado só.
 */
export function ReportsPanel({ athleteReport, coachNotes, coachName }: ReportsPanelProps) {
  const [text, setText] = useState(athleteReport);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await updateAthleteReport(text.trim());
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o relatório.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card id="meu-relatorio" className="scroll-mt-4">
        <CardTitle>Relatório</CardTitle>
        <p className="mt-1 text-sm text-g4-muted">
          Conte pro seu treinador como o treino ou a semana foi — bom ou ruim, o que quiser registrar.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Como foi seu treino/semana? Alguma dificuldade, dor, ou algo que valha comentar..."
            className={fieldClass}
          />
          {error && <p className="text-sm text-status-missed">{error}</p>}
          {saved && !error && <p className="text-sm text-lime-deep">Relatório salvo.</p>}
          <Button type="submit" variant="primary" className="self-start px-5" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar relatório"}
          </Button>
        </form>
      </Card>

      <Card id="relatorio-treinador" className="scroll-mt-4">
        <CardTitle>Relatório do treinador</CardTitle>
        {coachNotes ? (
          <p className="mt-2 text-sm leading-relaxed text-g4-ink">{coachNotes}</p>
        ) : (
          <p className="mt-2 text-sm text-g4-muted">{coachName} ainda não deixou nenhum comentário.</p>
        )}
      </Card>
    </div>
  );
}
