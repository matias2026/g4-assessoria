"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { getPrivateNotes, savePrivateNotes } from "@/app/(coach)/cockpit/notes-actions";
import {
  getMonitoringSummary,
  type CompletedSessionSource,
  type MonitoringSummary,
} from "@/app/(coach)/cockpit/monitoring-actions";
import { formatDistance, formatDuration } from "@/lib/workout-metrics";
import type { MockStudent } from "@/lib/mock-data";

const SOURCE_LABELS: Record<CompletedSessionSource, string> = {
  fit: "arquivo .FIT",
  strava: "Strava",
  rpe: "só RPE (sem arquivo)",
};

// weekStartIso é sempre "YYYY-MM-DD" — recorta direto a string em vez de
// passar por Date de novo, pra não arriscar um dia a menos/mais por causa
// do fuso horário local do navegador.
function formatWeekLabel(weekStartIso: string): string {
  const [, month, day] = weekStartIso.split("-");
  return `${day}/${month}`;
}

interface MonitoringTabProps {
  students: MockStudent[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
}

const fieldClass =
  "mt-1 w-full rounded-xl border border-g4-border bg-white p-2.5 text-sm text-g4-ink focus-ring";
const labelClass = "text-xs font-medium text-g4-muted";

/**
 * Aba "Monitoramento do Aluno" (só treinador): status de integração
 * Strava, resumo de volume, tendência de evolução, alerta de overtraining
 * e notas privadas. Todos os cards usam dado real — resumo/evolução/
 * overtraining vêm de getMonitoringSummary, que combina as duas fontes que
 * existem hoje (treinos com arquivo .FIT enviado + strava_activities
 * sincronizada), então um aluno sem Strava conectado mas que já mandou
 * .FIT continua aparecendo aqui. Sem nenhuma das duas fontes, os cards
 * mostram um aviso honesto de "sem dados ainda" em vez de números
 * inventados.
 */
export function MonitoringTab({ students, selectedStudentId, onSelectStudent }: MonitoringTabProps) {
  const student = students.find((s) => s.id === selectedStudentId) ?? students[0];

  // Notas por aluno, mantidas em memória por id — evita "piscar" texto do
  // aluno anterior ao trocar a seleção e permite derivar o estado de
  // carregamento/"salvo" a partir dos próprios dados, em vez de flags soltas.
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [savedNotesById, setSavedNotesById] = useState<Record<string, string>>({});
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  // Resumo de treinos concluídos (arquivo .FIT + Strava), por aluno — mesmo
  // padrão de cache em memória por id das notas acima.
  const [summaryById, setSummaryById] = useState<Record<string, MonitoringSummary>>({});
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const studentId = student?.id;
  const studentUserId = student?.userId ?? null;
  const summaryLoaded = studentId !== undefined && Object.prototype.hasOwnProperty.call(summaryById, studentId);
  const summary = studentId !== undefined ? summaryById[studentId] : undefined;

  useEffect(() => {
    if (!studentId || summaryLoaded) return;
    let cancelled = false;
    getMonitoringSummary(studentId, studentUserId)
      .then((value) => {
        if (cancelled) return;
        setSummaryById((prev) => ({ ...prev, [studentId]: value }));
      })
      .catch((e) => {
        if (!cancelled) setSummaryError(e instanceof Error ? e.message : "Não foi possível carregar o resumo de treinos.");
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, studentUserId, summaryLoaded]);

  const notesLoaded = studentId !== undefined && Object.prototype.hasOwnProperty.call(notesById, studentId);
  const notes = studentId !== undefined ? (notesById[studentId] ?? "") : "";
  const notesSaved = notesLoaded && savedNotesById[studentId as string] === notes;

  useEffect(() => {
    if (!studentId || notesLoaded) return;
    let cancelled = false;
    getPrivateNotes(studentId)
      .then((value) => {
        if (cancelled) return;
        setNotesById((prev) => ({ ...prev, [studentId]: value }));
        setSavedNotesById((prev) => ({ ...prev, [studentId]: value }));
      })
      .catch((e) => {
        if (!cancelled) setNotesError(e instanceof Error ? e.message : "Não foi possível carregar as notas.");
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, notesLoaded]);

  if (!student) {
    return <p className="text-sm text-g4-muted">Cadastre um aluno para liberar o monitoramento.</p>;
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    setNotesError(null);
    try {
      await savePrivateNotes(student.id, notes);
      setSavedNotesById((prev) => ({ ...prev, [student.id]: notes }));
    } catch (e) {
      setNotesError(e instanceof Error ? e.message : "Não foi possível salvar as notas.");
    } finally {
      setNotesSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <label className="block sm:max-w-sm">
          <span className={labelClass}>Aluno</span>
          <select value={student.id} onChange={(e) => onSelectStudent(e.target.value)} className={fieldClass}>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {/* 1. Status de integração */}
      <Card>
        <CardTitle>Status de integração</CardTitle>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-g4-ink">Strava</p>
          <Badge tone={student.stravaSynced ? "lime" : "neutral"}>
            {student.stravaSynced ? "Conectado" : "Desconectado"}
          </Badge>
        </div>
      </Card>

      {/* 2. Resumo de treinos concluídos */}
      <Card>
        <CardTitle>Resumo de treinos concluídos</CardTitle>
        {summaryError ? (
          <p className="mt-2 text-sm text-status-missed">{summaryError}</p>
        ) : !summaryLoaded ? (
          <p className="mt-2 text-sm text-g4-muted">Carregando...</p>
        ) : summary && summary.totalCount > 0 ? (
          <div className="mt-2">
            <p className="text-sm text-g4-ink">
              {summary.totalCount} treino{summary.totalCount > 1 ? "s" : ""} concluído
              {summary.totalCount > 1 ? "s" : ""} nos últimos 42 dias.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              {summary.totalDistanceMeters > 0 && (
                <p className="text-g4-muted">
                  Distância <span className="block text-g4-ink">{formatDistance(summary.totalDistanceMeters)}</span>
                </p>
              )}
              {summary.totalDurationSeconds > 0 && (
                <p className="text-g4-muted">
                  Duração <span className="block text-g4-ink">{formatDuration(summary.totalDurationSeconds)}</span>
                </p>
              )}
              {summary.avgRpe != null && (
                <p className="text-g4-muted">
                  RPE médio <span className="block text-g4-ink">{summary.avgRpe.toFixed(1)}</span>
                </p>
              )}
            </div>
            <p className="mt-3 text-xs text-g4-muted">
              Fonte:{" "}
              {Object.entries(
                summary.sessions.reduce<Record<string, number>>((acc, s) => {
                  acc[s.source] = (acc[s.source] ?? 0) + 1;
                  return acc;
                }, {})
              )
                .map(([source, count]) => `${count} via ${SOURCE_LABELS[source as CompletedSessionSource]}`)
                .join(", ")}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-g4-muted">
            Nenhum treino concluído nos últimos 42 dias —{" "}
            {student.stravaSynced
              ? "sem atividades sincronizadas do Strava nesse período, e ainda não enviou nenhum arquivo .FIT de treino realizado."
              : "sem Strava conectado, e ainda não enviou nenhum arquivo .FIT de treino realizado."}
          </p>
        )}
      </Card>

      {/* 3. Gráfico de evolução (carga semanal — TSS quando existe, senão minutos) */}
      <Card>
        <CardTitle>Evolução</CardTitle>
        {summaryError ? (
          <p className="mt-2 text-sm text-status-missed">{summaryError}</p>
        ) : !summaryLoaded ? (
          <p className="mt-2 text-sm text-g4-muted">Carregando...</p>
        ) : summary && summary.loadMetric && summary.weeklyLoad.length >= 2 ? (
          <div className="mt-3 flex flex-col gap-2">
            {summary.weeklyLoad.map((week) => {
              const maxValue = Math.max(...summary.weeklyLoad.map((w) => w.value));
              const widthPct = maxValue > 0 ? Math.round((week.value / maxValue) * 100) : 0;
              return (
                <div key={week.weekStartIso} className="flex items-center gap-4 text-sm">
                  <span className="w-14 shrink-0 text-g4-muted">{formatWeekLabel(week.weekStartIso)}</span>
                  <div className="h-2 flex-1 rounded-full bg-g4-surface-alt">
                    <div className="h-2 rounded-full bg-lime" style={{ width: `${widthPct}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-g4-ink">
                    {Math.round(week.value)} {summary.loadMetric === "tss" ? "TSS" : "min"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-sm text-g4-muted">
            {summary && summary.loadMetric
              ? "Ainda só há uma semana com dado de carga — envie/complete treinos por pelo menos mais uma semana pra liberar a tendência."
              : "Ainda não há dados suficientes pra mostrar uma tendência de carga/volume — depende de treinos concluídos com duração ou TSS (arquivo .FIT enviado ou Strava sincronizado)."}
          </p>
        )}
      </Card>

      {/* 4. Alerta de overtraining (compara carga da semana atual x anterior) */}
      <Card>
        <CardTitle>Alerta de overtraining</CardTitle>
        {summaryError ? (
          <p className="mt-2 text-sm text-status-missed">{summaryError}</p>
        ) : !summaryLoaded ? (
          <p className="mt-2 text-sm text-g4-muted">Carregando...</p>
        ) : summary && summary.loadMetric && summary.weeklyLoad.length >= 2 ? (
          (() => {
            const [previous, current] = summary.weeklyLoad.slice(-2);
            const pctChange = previous.value > 0 ? ((current.value - previous.value) / previous.value) * 100 : 0;
            const elevated = previous.value > 0 && pctChange >= 50;
            const metricLabel = summary.loadMetric === "tss" ? "de carga (TSS)" : "de volume (minutos treinados)";
            return (
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-sm text-g4-ink">
                  {elevated
                    ? `Salto ${metricLabel} em relação à semana anterior (${pctChange >= 0 ? "+" : ""}${Math.round(pctChange)}%) — considere avaliar volume/intensidade.`
                    : `Variação ${metricLabel} estável em relação à semana anterior (${pctChange >= 0 ? "+" : ""}${Math.round(pctChange)}%).`}
                </p>
                <Badge tone={elevated ? "danger" : "lime"}>{elevated ? "Atenção" : "OK"}</Badge>
              </div>
            );
          })()
        ) : (
          <p className="mt-2 text-sm text-g4-muted">
            Sem semanas suficientes com dado de carga/volume pra avaliar risco de overtraining ainda.
          </p>
        )}
      </Card>

      {/* 5. Notas do treinador (privadas) */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Notas do treinador</CardTitle>
          <Badge tone="neutral">Privado</Badge>
        </div>
        <p className="mt-1 text-xs text-g4-muted">Só você vê essas notas — o aluno não tem acesso, nem no próprio perfil.</p>

        <textarea
          value={notes}
          onChange={(e) => setNotesById((prev) => ({ ...prev, [student.id]: e.target.value }))}
          disabled={!notesLoaded}
          rows={5}
          placeholder="Dores relatadas, ajustes de carga, observações gerais..."
          className={cn(fieldClass, "mt-3 disabled:opacity-60")}
        />

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Button variant="primary" onClick={handleSaveNotes} disabled={notesSaving || !notesLoaded}>
            {notesSaving ? "Salvando..." : notesSaved ? "Salvo ✓" : "Salvar notas"}
          </Button>
          {!notesLoaded && <span className="text-xs text-g4-muted">Carregando...</span>}
        </div>
        {notesError && <p className="mt-2 text-sm text-status-missed">{notesError}</p>}
      </Card>
    </div>
  );
}
