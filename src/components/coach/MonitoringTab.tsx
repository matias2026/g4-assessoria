"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { getPrivateNotes, savePrivateNotes } from "@/app/(coach)/cockpit/notes-actions";
import {
  getMonitoringSummary,
  type CompletedSessionSource,
  type LoadMetric,
  type MonitoringSummary,
} from "@/app/(coach)/cockpit/monitoring-actions";
import { formatDistance, formatDuration } from "@/lib/workout-metrics";
import type { MockStudent } from "@/lib/mock-data";

// Eixo/grade no tom claro do resto do site (não o tema escuro usado nos
// gráficos de atividade individual) — esses cards de tendência convivem com
// o restante da aba, sempre clara.
const AXIS_TICK = { fontSize: 11, fill: "#68707b" };
const GRID_STROKE = "#e2e5ea";

// Cores padrão dos gráficos de métrica do app (mesmas usadas em
// ActivitySyncedCharts, já no estilo Strava): FC = rosa/vermelho, cadência
// tem sua própria cor lá mas as zonas de esforço aqui seguem o
// semáforo verde/amarelo/vermelho já usado nos badges do Alerta de
// overtraining.
const COLOR_HEART_RATE = "#f43f5e";
const COLOR_ZONE_LEVE = "#38bdf8";
const COLOR_ZONE_MODERADO = "#22c55e";
const COLOR_ZONE_INTENSO = "#f43f5e";
const COLOR_ACWR_LINE = "#14161a";
const COLOR_ACWR_BELOW = "#94a3b8";
const COLOR_ACWR_IDEAL = "#4d7c0f";
const COLOR_ACWR_ATENCAO = "#b45309";
const COLOR_ACWR_RISCO = "#b91c1c";

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
const METRIC_LABEL: Record<LoadMetric, string> = {
  tss: "de carga (TSS)",
  trimp: "de carga cardíaca (TRIMP)",
  relative_effort: "de esforço (Relative Effort)",
  minutes: "de volume (minutos treinados)",
};

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
  const [refreshingSummary, setRefreshingSummary] = useState(false);

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

  // Busca de novo por baixo do pano — o cache acima só busca na primeira
  // vez que o aluno é selecionado, então uma sincronização da Strava feita
  // com essa aba já aberta nunca aparecia sem trocar de aluno ou recarregar
  // a página inteira.
  async function refreshSummary() {
    if (!studentId) return;
    setSummaryError(null);
    setRefreshingSummary(true);
    try {
      const value = await getMonitoringSummary(studentId, studentUserId);
      setSummaryById((prev) => ({ ...prev, [studentId]: value }));
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Não foi possível atualizar o resumo de treinos.");
    } finally {
      setRefreshingSummary(false);
    }
  }

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
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Resumo de treinos concluídos</CardTitle>
          <button
            type="button"
            onClick={refreshSummary}
            disabled={refreshingSummary || !summaryLoaded}
            className="shrink-0 text-xs font-semibold text-lime-deep underline underline-offset-2 focus-ring disabled:opacity-60"
          >
            {refreshingSummary ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
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
                    {Math.round(week.value)} {METRIC_UNIT[summary.loadMetric!]}
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

      {/* 4. Alerta de overtraining (ACWR — carga aguda de 7 dias / crônica de 28 dias) */}
      <Card>
        <CardTitle>Alerta de overtraining</CardTitle>
        <p className="mt-1 text-xs text-g4-muted">
          ACWR (Acute:Chronic Workload Ratio) — carga dos últimos 7 dias comparada à média semanal dos últimos 28.
        </p>
        {summaryError ? (
          <p className="mt-2 text-sm text-status-missed">{summaryError}</p>
        ) : !summaryLoaded ? (
          <p className="mt-2 text-sm text-g4-muted">Carregando...</p>
        ) : summary && summary.acwr ? (
          (() => {
            const { ratio, acuteLoad, chronicWeeklyAvg, metric } = summary.acwr;
            const tone: "danger" | "warning" | "lime" = ratio > 1.5 ? "danger" : ratio > 1.3 ? "warning" : "lime";
            const label = ratio > 1.5 ? "🔴 Risco de overtraining" : ratio > 1.3 ? "🟡 Atenção" : "🟢 Ideal";
            const message =
              ratio > 1.5
                ? `Carga ${METRIC_LABEL[metric]} ${Math.round((ratio - 1) * 100)}% acima da média mensal — risco elevado de lesão/overtraining. Considere uma semana regenerativa.`
                : ratio > 1.3
                  ? `Carga ${METRIC_LABEL[metric]} subindo mais rápido que o normal — vale avaliar reduzir volume/intensidade nos próximos dias.`
                  : ratio < 0.8
                    ? `Carga ${METRIC_LABEL[metric]} abaixo do normal — semana leve ou de recuperação, sem sinal de risco.`
                    : `Carga ${METRIC_LABEL[metric]} dentro da faixa segura (0.8–1.3) — o aluno está assimilando bem o volume atual.`;
            const intensoSpike = summary.zoneLoad?.intensoSpike ?? false;
            const rpeTrend = summary.rpeTrend;
            const history = summary.acwr.history;
            // Arredondado pra 1 casa — soma direta de floats (ex.: 1.6 + 0.1)
            // vira 1.7000000000000002 e aparece cortado no eixo Y.
            const acwrMax = history.length > 0 ? Math.round((Math.max(1.6, ...history.map((h) => h.ratio)) + 0.1) * 10) / 10 : 1.6;

            return (
              <div className="mt-3">
                {history.length >= 2 && (
                  <div className="mb-4 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="dateIso" tickFormatter={formatWeekLabel} tick={AXIS_TICK} stroke={GRID_STROKE} minTickGap={24} />
                        <YAxis tick={AXIS_TICK} stroke={GRID_STROKE} domain={[0, acwrMax]} width={40} />
                        <Tooltip
                          labelFormatter={(value) => formatWeekLabel(String(value))}
                          formatter={(value) => [Number(value).toFixed(2), "ACWR"]}
                          contentStyle={{ fontSize: 12 }}
                        />
                        {/* Faixas do semáforo (0.8-1.3 ideal, 1.3-1.5 atenção, acima
                            de 1.5 risco) atrás da linha — mesma leitura do badge. */}
                        <ReferenceArea y1={0} y2={0.8} fill={COLOR_ACWR_BELOW} fillOpacity={0.1} />
                        <ReferenceArea y1={0.8} y2={1.3} fill={COLOR_ACWR_IDEAL} fillOpacity={0.12} />
                        <ReferenceArea y1={1.3} y2={1.5} fill={COLOR_ACWR_ATENCAO} fillOpacity={0.12} />
                        <ReferenceArea y1={1.5} y2={acwrMax} fill={COLOR_ACWR_RISCO} fillOpacity={0.12} />
                        <Line
                          type="monotone"
                          dataKey="ratio"
                          stroke={COLOR_ACWR_LINE}
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-g4-ink">{message}</p>
                  <Badge tone={tone}>{label}</Badge>
                </div>
                <p className="mt-2 text-xs text-g4-muted">
                  ACWR {ratio.toFixed(2)} — aguda (7d): {Math.round(acuteLoad)} {METRIC_UNIT[metric]} · crônica
                  (méd./semana): {Math.round(chronicWeeklyAvg)} {METRIC_UNIT[metric]}
                </p>
                {(intensoSpike || rpeTrend) && (
                  <div className="mt-3 flex flex-col gap-1.5 border-t border-g4-border pt-3">
                    {intensoSpike && (
                      <p className="text-xs text-g4-ink">
                        ⚠️ Tempo em zona intensa (Z4+Z5) deu um salto em relação à semana anterior — gatilho comum de
                        overtraining mesmo quando o volume total parece normal. Ver &quot;Tempo nas zonas de FC&quot;
                        abaixo.
                      </p>
                    )}
                    {rpeTrend && (
                      <p className="text-xs text-g4-ink">
                        {rpeTrend.rising
                          ? `RPE subjetivo do aluno também subiu — de ${rpeTrend.baselineAvg.toFixed(1)} pra ${rpeTrend.recentAvg.toFixed(1)} nos últimos 7 dias${tone !== "lime" ? ", reforçando o sinal objetivo acima" : ", mesmo com a carga objetiva dentro da faixa segura — vale conversar com o aluno"}.`
                          : `RPE subjetivo segue estável (${rpeTrend.recentAvg.toFixed(1)} recente vs. ${rpeTrend.baselineAvg.toFixed(1)} antes)${tone !== "lime" ? " — o aluno ainda não relata sentir o esforço extra, mas vale acompanhar" : ""}.`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <p className="mt-2 text-sm text-g4-muted">
            Sem carga suficiente nos últimos 28 dias pra calcular o ACWR ainda.
          </p>
        )}
      </Card>

      {/* 5. Eficiência cardíaca (cadência/FC) — desacoplamento aeróbico entre semanas */}
      <Card>
        <CardTitle>Eficiência cardíaca</CardTitle>
        <p className="mt-1 text-xs text-g4-muted">
          Cadência ÷ FC média por semana — se cai ao longo do tempo, a mesma cadência está exigindo uma FC cada vez
          mais alta (sinal de fadiga acumulada), mesmo com carga estável.
        </p>
        {summaryError ? (
          <p className="mt-2 text-sm text-status-missed">{summaryError}</p>
        ) : !summaryLoaded ? (
          <p className="mt-2 text-sm text-g4-muted">Carregando...</p>
        ) : summary && summary.cardiacEfficiency ? (
          (() => {
            const { points, pctChange, declining } = summary.cardiacEfficiency;
            return (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-g4-ink">
                    {declining
                      ? `Eficiência caiu ${Math.abs(Math.round(pctChange))}% em relação à semana anterior — vale investigar fadiga acumulada ou necessidade de recuperação.`
                      : `Eficiência ${pctChange >= 0 ? "estável ou em alta" : "com leve queda"} em relação à semana anterior (${pctChange >= 0 ? "+" : ""}${Math.round(pctChange)}%).`}
                  </p>
                  <Badge tone={declining ? "warning" : "lime"}>{declining ? "Atenção" : "OK"}</Badge>
                </div>
                <div className="mt-3 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="weekStartIso" tickFormatter={formatWeekLabel} tick={AXIS_TICK} stroke={GRID_STROKE} minTickGap={24} />
                      <YAxis
                        tick={AXIS_TICK}
                        stroke={GRID_STROKE}
                        width={40}
                        domain={["dataMin - 0.02", "dataMax + 0.02"]}
                        tickFormatter={(v: number) => v.toFixed(2)}
                      />
                      <Tooltip
                        labelFormatter={(value) => formatWeekLabel(String(value))}
                        formatter={(value) => [`${Number(value).toFixed(2)} rpm/bpm`, "Eficiência"]}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={COLOR_HEART_RATE}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-col gap-2 border-t border-g4-border pt-3">
                  {points.map((point) => {
                    const maxValue = Math.max(...points.map((p) => p.value));
                    const widthPct = maxValue > 0 ? Math.round((point.value / maxValue) * 100) : 0;
                    return (
                      <div key={point.weekStartIso} className="flex items-center gap-4 text-sm">
                        <span className="w-14 shrink-0 text-g4-muted">{formatWeekLabel(point.weekStartIso)}</span>
                        <div className="h-2 flex-1 rounded-full bg-g4-surface-alt">
                          <div className="h-2 rounded-full" style={{ width: `${widthPct}%`, backgroundColor: COLOR_HEART_RATE }} />
                        </div>
                        <span className="w-16 shrink-0 text-right text-g4-ink">{point.value.toFixed(2)} rpm/bpm</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        ) : (
          <p className="mt-2 text-sm text-g4-muted">
            Sem pelo menos 2 semanas com cadência e FC média na mesma sessão ainda — depende de treinos com sensor de
            cadência e de FC juntos (a maioria dos treinos só por GPS não tem os dois).
          </p>
        )}
      </Card>

      {/* 6. Tempo nas zonas de FC (Z1-Z5, agregado em leve/moderado/intenso) */}
      <Card>
        <CardTitle>Tempo nas zonas de FC</CardTitle>
        <p className="mt-1 text-xs text-g4-muted">
          Minutos por semana em zona leve (Z1+Z2), moderada (Z3) e intensa (Z4+Z5) — um salto no intenso sem aumento
          de volume total é o gatilho mais comum de overtraining.
        </p>
        {summaryError ? (
          <p className="mt-2 text-sm text-status-missed">{summaryError}</p>
        ) : !summaryLoaded ? (
          <p className="mt-2 text-sm text-g4-muted">Carregando...</p>
        ) : summary && summary.zoneLoad ? (
          <div className="mt-3 flex flex-col gap-3">
            {summary.zoneLoad.intensoSpike && (
              <p className="text-sm text-status-pending">
                ⚠️ Zona intensa saltou
                {summary.zoneLoad.intensoPctChange != null
                  ? ` ${Math.round(summary.zoneLoad.intensoPctChange)}%`
                  : ""}{" "}
                em relação à semana anterior.
              </p>
            )}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.zoneLoad.weeks} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="weekStartIso" tickFormatter={formatWeekLabel} tick={AXIS_TICK} stroke={GRID_STROKE} minTickGap={24} />
                  <YAxis tick={AXIS_TICK} stroke={GRID_STROKE} width={40} />
                  <Tooltip
                    labelFormatter={(value) => formatWeekLabel(String(value))}
                    formatter={(value, name) => [`${Math.round(Number(value))} min`, name]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="leve" name="Leve" stackId="zona" fill={COLOR_ZONE_LEVE} isAnimationActive={false} />
                  <Bar dataKey="moderado" name="Moderada" stackId="zona" fill={COLOR_ZONE_MODERADO} isAnimationActive={false} />
                  <Bar
                    dataKey="intenso"
                    name="Intensa"
                    stackId="zona"
                    fill={COLOR_ZONE_INTENSO}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-g4-muted">
              <span className="mr-3 inline-flex items-center gap-4">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_ZONE_LEVE }} aria-hidden />
                leve
              </span>
              <span className="mr-3 inline-flex items-center gap-4">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_ZONE_MODERADO }} aria-hidden />
                moderada
              </span>
              <span className="inline-flex items-center gap-4">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_ZONE_INTENSO }} aria-hidden />
                intensa
              </span>
            </p>
            <div className="flex flex-col gap-3 border-t border-g4-border pt-3">
              {summary.zoneLoad.weeks.map((week) => {
                const total = week.leve + week.moderado + week.intenso;
                return (
                  <div key={week.weekStartIso} className="text-sm">
                    <div className="flex items-center justify-between text-g4-muted">
                      <span>{formatWeekLabel(week.weekStartIso)}</span>
                      <span>{Math.round(total)} min</span>
                    </div>
                    <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-g4-surface-alt">
                      {total > 0 && (
                        <>
                          <div className="h-2" style={{ width: `${(week.leve / total) * 100}%`, backgroundColor: COLOR_ZONE_LEVE }} />
                          <div className="h-2" style={{ width: `${(week.moderado / total) * 100}%`, backgroundColor: COLOR_ZONE_MODERADO }} />
                          <div className="h-2" style={{ width: `${(week.intenso / total) * 100}%`, backgroundColor: COLOR_ZONE_INTENSO }} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-g4-muted">
            Sem amostras de FC ponto a ponto ainda — depende de um treino com arquivo .FIT ou atividade da Strava
            anexada ao dia (registrando FC durante o treino, não só a média).
          </p>
        )}
      </Card>

      {/* 7. Notas do treinador (privadas) */}
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
