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

const AXIS_TICK = { fontSize: 11, fill: "#a1a1aa" };
const GRID_STROKE = "#3f3f46";
const CURSOR_STYLE = { stroke: "#71717a", strokeDasharray: "3 3" };

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
 * Cadência (linha) e altimetria (área), empilhados e sincronizados pelo
 * mesmo eixo X via `syncId` do Recharts — passar o mouse sobre qualquer
 * um dos dois move o cursor nos dois e atualiza o resumo acima com os
 * valores exatos daquele instante (em vez de dois tooltips flutuantes
 * separados, como no layout de referência do Intervals.icu).
 */
export function ActivitySyncedCharts({ samples }: ActivitySyncedChartsProps) {
  const [activeSample, setActiveSample] = useState<ActivitySample | null>(null);
  const active = activeSample ?? samples[samples.length - 1];

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-4 text-sm">
        <span className="text-neutral-400">{formatElapsed(active.timestamp)}</span>
        <span className="text-neutral-100">
          Cadência <span className="font-semibold text-fuchsia-400">{active.cadence}</span>
        </span>
        <span className="text-neutral-100">
          Altitude <span className="font-semibold text-neutral-200">{active.altitudeMeters}m</span>
        </span>
      </div>

      <div className="mt-2 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={samples} syncId="activity-detail" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="timestamp" tickFormatter={formatElapsed} tick={AXIS_TICK} stroke={GRID_STROKE} minTickGap={40} />
            <YAxis tick={AXIS_TICK} stroke={GRID_STROKE} width={32} domain={[0, "dataMax + 10"]} />
            <Tooltip content={<TooltipSync onChange={setActiveSample} />} cursor={CURSOR_STYLE} />
            <Line type="monotone" dataKey="cadence" stroke="#e879f9" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={samples} syncId="activity-detail" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="activityAltitudeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e4e4e7" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#e4e4e7" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="timestamp" tickFormatter={formatElapsed} tick={AXIS_TICK} stroke={GRID_STROKE} minTickGap={40} />
            <YAxis tick={AXIS_TICK} stroke={GRID_STROKE} width={32} />
            <Tooltip content={<TooltipSync onChange={setActiveSample} />} cursor={CURSOR_STYLE} />
            <Area
              type="monotone"
              dataKey="altitudeMeters"
              stroke="#d4d4d8"
              strokeWidth={1.5}
              fill="url(#activityAltitudeFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
