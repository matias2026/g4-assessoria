"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { getOwnMonitoringSummary } from "@/app/(athlete)/dashboard/profile-actions";
import type { CompletedSessionSource, LoadMetric, MonitoringSummary } from "@/lib/monitoring";
import { formatDistance, formatDuration } from "@/lib/workout-metrics";

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

const METRIC_UNIT: Record<LoadMetric, string> = { tss: "TSS", trimp: "TRIMP", relative_effort: "RE", minutes: "min" };

interface TrainingSummaryCardsProps {
  // Prévia do admin (buildExampleWorkout, sem linha própria em `alunos`) —
  // getOwnMonitoringSummary falharia por não achar ficha nenhuma, mesmo
  // motivo de isPreview em AthleteWorkoutView.
  isPreview?: boolean;
}

/**
 * Resumo de treinos concluídos + Evolução — os mesmos dois cards que o
 * treinador vê em "Monitoramento do aluno" (ver MonitoringTab.tsx), agora
 * também na área do próprio aluno, sempre sobre a conta dele mesmo (ver
 * getOwnMonitoringSummary em dashboard/profile-actions.ts).
 */
export function TrainingSummaryCards({ isPreview = false }: TrainingSummaryCardsProps) {
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPreview) return;
    let cancelled = false;
    getOwnMonitoringSummary()
      .then((value) => {
        if (cancelled) return;
        setSummary(value);
        setLoaded(true);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Não foi possível carregar seu resumo de treinos.");
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isPreview]);

  if (isPreview) {
    return (
      <Card>
        <CardTitle>Resumo de treinos e evolução</CardTitle>
        <p className="mt-2 text-sm text-g4-muted">
          Prévia — esses cards aparecem com dado real só na conta de um aluno de verdade.
        </p>
      </Card>
    );
  }

  return (
    <>
      {/* Resumo de treinos concluídos */}
      <Card>
        <CardTitle>Resumo de treinos concluídos</CardTitle>
        {error ? (
          <p className="mt-2 text-sm text-status-missed">{error}</p>
        ) : !loaded ? (
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
            Nenhum treino concluído nos últimos 42 dias — envie um arquivo .FIT ou conecte o Strava pra começar a
            acompanhar sua evolução.
          </p>
        )}
      </Card>

      {/* Evolução */}
      <Card>
        <CardTitle>Evolução</CardTitle>
        {error ? (
          <p className="mt-2 text-sm text-status-missed">{error}</p>
        ) : !loaded ? (
          <p className="mt-2 text-sm text-g4-muted">Carregando...</p>
        ) : summary && summary.loadMetric && summary.weeklyLoad.length >= 2 ? (
          <div className="mt-3 flex flex-col gap-4">
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
                    {Math.round(week.value)} {METRIC_UNIT[summary.loadMetric!]}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-sm text-g4-muted">
            {summary && summary.loadMetric
              ? "Ainda só há uma semana com dado de carga — complete treinos por pelo menos mais uma semana pra liberar a tendência."
              : "Ainda não há dados suficientes pra mostrar uma tendência de carga/volume — depende de treinos concluídos com duração ou TSS (arquivo .FIT enviado ou Strava sincronizado)."}
          </p>
        )}
      </Card>
    </>
  );
}
