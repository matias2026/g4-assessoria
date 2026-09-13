"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { getPrivateNotes, savePrivateNotes } from "@/app/(coach)/cockpit/notes-actions";
import { buildMonitoringSummary } from "@/lib/monitoring-mock";
import type { MockStudent } from "@/lib/mock-data";

interface MonitoringTabProps {
  students: MockStudent[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
}

const fieldClass =
  "mt-1 w-full rounded-xl border border-g4-border bg-white p-2.5 text-sm text-g4-ink focus-ring";
const labelClass = "text-xs font-medium text-g4-muted";

const AXIS_TICK = { fontSize: 11, fill: "#68707b" };

const RISK_CONFIG: Record<"low" | "medium" | "high", { label: string; dot: string; text: string; bg: string }> = {
  low: { label: "Verde — carga ideal", dot: "bg-status-done-dot", text: "text-status-done", bg: "bg-status-done/10" },
  medium: { label: "Amarelo — atenção", dot: "bg-status-pending-dot", text: "text-status-pending", bg: "bg-status-pending/10" },
  high: {
    label: "Vermelho — risco alto de overtraining",
    dot: "bg-status-missed-dot",
    text: "text-status-missed",
    bg: "bg-status-missed/10",
  },
};

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-g4-surface-alt p-3">
      <p className="text-xs text-g4-muted">{label}</p>
      <p className="mt-1 text-base font-bold text-g4-ink">{value}</p>
    </div>
  );
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

/**
 * Aba "Monitoramento do Aluno" (só treinador): status de integração
 * Strava, resumo de volume, tendência de evolução, alerta de overtraining
 * e notas privadas. O status do Strava é real (`student.stravaSynced`) e
 * as notas persistem de verdade (tabela própria, sem RLS pro aluno);
 * volume, atividades recentes, tendência e overtraining são um exemplo
 * determinístico por aluno até existir ingestão real do Strava e
 * histórico de treinos concluídos.
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

  const studentId = student?.id;
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

  const summary = buildMonitoringSummary(student);
  const risk = RISK_CONFIG[summary.overtrainingRisk];

  // Pace: menor é melhor. Nas demais métricas (FTP, volume), maior é melhor.
  const lowerIsBetter = summary.trendUnit === "min/km";
  const firstTrend = summary.trend[0]?.value ?? 0;
  const lastTrend = summary.trend[summary.trend.length - 1]?.value ?? 0;
  const isImproving = lowerIsBetter ? lastTrend < firstTrend : lastTrend > firstTrend;

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
        <p className="mt-1 text-xs text-g4-muted">Exemplo ilustrativo — ainda sem ingestão real de atividades.</p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryStat label="Semana — km" value={`${summary.weekly.distanceKm} km`} />
          <SummaryStat label="Semana — tempo" value={formatMinutes(summary.weekly.durationMinutes)} />
          <SummaryStat label="Semana — treinos" value={`${summary.weekly.completed}/${summary.weekly.prescribed}`} />
          <SummaryStat label="Mês — km" value={`${summary.monthly.distanceKm} km`} />
        </div>

        <div className="mt-4 border-t border-g4-border pt-4">
          <p className="text-xs font-medium text-g4-muted">Últimas atividades (Strava)</p>
          <ul className="mt-2 flex flex-col gap-4">
            {summary.recentActivities.map((activity) => (
              <li key={activity.name + activity.date} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-g4-ink">{activity.name}</span>
                <span className="shrink-0 text-right text-g4-muted">
                  {activity.distanceKm} km · {formatMinutes(activity.durationMinutes)} · {activity.date}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* 3. Gráfico de evolução */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle>Evolução — {summary.trendMetricLabel}</CardTitle>
          <Badge tone={isImproving ? "lime" : "danger"}>{isImproving ? "Evolução" : "Estagnação/Queda"}</Badge>
        </div>

        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={summary.trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e2e5ea" vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} stroke="#e2e5ea" />
              <YAxis tick={AXIS_TICK} stroke="#e2e5ea" width={44} domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip
                formatter={(value) => [`${value} ${summary.trendUnit}`, summary.trendMetricLabel]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e5ea", fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={isImproving ? "#4d7c0f" : "#b91c1c"}
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 4. Alerta de overtraining */}
      <Card>
        <CardTitle>Alerta de overtraining</CardTitle>
        <div className={cn("mt-3 flex items-center gap-4 rounded-xl p-3", risk.bg)}>
          <span className={cn("h-3 w-3 shrink-0 rounded-full", risk.dot)} aria-hidden />
          <p className={cn("text-sm font-semibold", risk.text)}>{risk.label}</p>
        </div>
        <ul className="mt-3 flex flex-col gap-4 text-sm text-g4-muted">
          {summary.overtrainingReasons.map((reason) => (
            <li key={reason}>• {reason}</li>
          ))}
        </ul>
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
