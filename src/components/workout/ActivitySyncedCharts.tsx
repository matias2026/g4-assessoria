"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActivitySample } from "@/lib/activity-detail";

interface ActivitySyncedChartsProps {
  samples: ActivitySample[];
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

const AXIS_TICK = { fontSize: 11, fill: "#68707b" }; // g4-muted
const GRID_STROKE = "#e2e5ea"; // g4-border
const CURSOR_STYLE = { stroke: "#68707b", strokeDasharray: "3 3" };

const CADENCE_COLOR = "#c026d3";
const POWER_COLOR = "#f97316";
const HEART_RATE_COLOR = "#f43f5e";
const ALTITUDE_COLOR = "#94a3b8";

// Título fixo acima de cada gráfico, na cor da própria linha — o resumo
// lá em cima só aparece com valores ao passar o mouse, então sem isso não
// dava pra saber qual gráfico é qual só de olhar.
function ChartLabel({ color, children }: { color: string; children: string }) {
  return (
    <p className="text-xs font-semibold" style={{ color }}>
      {children}
    </p>
  );
}

interface TooltipSyncProps {
  active?: boolean;
  payload?: { payload: ActivitySample }[];
  onChange: (sample: ActivitySample | null) => void;
}

// Não renderiza nada visível — só existe pra ler o ponto de dados ativo do
// Tooltip do Recharts (a API pública estável para isso) e repassar pro
// resumo compartilhado acima dos dois gráficos. Atualiza via efeito, não
// durante o render, pra não mexer no estado de um componente pai enquanto
// este ainda está renderizando.
function TooltipSync({ active, payload, onChange }: TooltipSyncProps) {
  const sample = active && payload && payload.length > 0 ? payload[0].payload : null;

  useEffect(() => {
    onChange(sample);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample?.timestamp, active]);

  return null;
}

/**
 * Cadência, potência, frequência cardíaca (linhas) e altimetria (área),
 * empilhados e sincronizados pelo mesmo eixo X via `syncId` do Recharts —
 * passar o mouse sobre qualquer um dos quatro move o cursor em todos e
 * atualiza o resumo acima com os valores exatos daquele instante (em vez
 * de tooltips flutuantes separados, como no layout de referência do
 * Intervals.icu).
 */
export function ActivitySyncedCharts({ samples }: ActivitySyncedChartsProps) {
  const [activeSample, setActiveSample] = useState<ActivitySample | null>(null);
  const active = activeSample ?? samples[samples.length - 1];

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-4 text-sm">
        <span className="text-g4-muted">{formatElapsed(active.timestamp)}</span>
        <span className="text-g4-ink">
          Cadência <span className="font-semibold text-fuchsia-600">{active.cadence}</span>
        </span>
        <span className="text-g4-ink">
          Potência <span className="font-semibold text-orange-600">{active.power}W</span>
        </span>
        <span className="text-g4-ink">
          FC <span className="font-semibold text-rose-600">{active.heartRate}</span>
        </span>
        <span className="text-g4-ink">
          Altitude <span className="font-semibold text-slate-600">{active.altitudeMeters}m</span>
        </span>
      </div>

      <div className="mt-3">
        <ChartLabel color={CADENCE_COLOR}>Cadência (rpm)</ChartLabel>
        <div className="mt-1 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={samples} syncId="activity-detail" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="timestamp" tickFormatter={formatElapsed} tick={AXIS_TICK} stroke={GRID_STROKE} minTickGap={40} />
              <YAxis tick={AXIS_TICK} stroke={GRID_STROKE} width={32} domain={[0, "dataMax + 10"]} />
              <Tooltip content={<TooltipSync onChange={setActiveSample} />} cursor={CURSOR_STYLE} />
              <Line type="monotone" dataKey="cadence" stroke={CADENCE_COLOR} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3">
        <ChartLabel color={POWER_COLOR}>Potência (W)</ChartLabel>
        <div className="mt-1 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={samples} syncId="activity-detail" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="timestamp" tickFormatter={formatElapsed} tick={AXIS_TICK} stroke={GRID_STROKE} minTickGap={40} />
              <YAxis tick={AXIS_TICK} stroke={GRID_STROKE} width={32} domain={[0, "dataMax + 20"]} />
              <Tooltip content={<TooltipSync onChange={setActiveSample} />} cursor={CURSOR_STYLE} />
              <Line type="monotone" dataKey="power" stroke={POWER_COLOR} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3">
        <ChartLabel color={HEART_RATE_COLOR}>Frequência cardíaca (bpm)</ChartLabel>
        <div className="mt-1 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={samples} syncId="activity-detail" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="timestamp" tickFormatter={formatElapsed} tick={AXIS_TICK} stroke={GRID_STROKE} minTickGap={40} />
              <YAxis tick={AXIS_TICK} stroke={GRID_STROKE} width={32} domain={["dataMin - 10", "dataMax + 10"]} />
              <Tooltip content={<TooltipSync onChange={setActiveSample} />} cursor={CURSOR_STYLE} />
              <Line type="monotone" dataKey="heartRate" stroke={HEART_RATE_COLOR} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3">
        <ChartLabel color={ALTITUDE_COLOR}>Altitude (m)</ChartLabel>
        <div className="mt-1 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={samples} syncId="activity-detail" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="activityAltitudeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ALTITUDE_COLOR} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={ALTITUDE_COLOR} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="timestamp" tickFormatter={formatElapsed} tick={AXIS_TICK} stroke={GRID_STROKE} minTickGap={40} />
              <YAxis tick={AXIS_TICK} stroke={GRID_STROKE} width={32} />
              <Tooltip content={<TooltipSync onChange={setActiveSample} />} cursor={CURSOR_STYLE} />
              <Area
                type="monotone"
                dataKey="altitudeMeters"
                stroke={ALTITUDE_COLOR}
                strokeWidth={1.5}
                fill="url(#activityAltitudeFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
