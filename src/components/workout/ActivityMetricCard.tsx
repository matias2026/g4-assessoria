"use client";

import { useEffect } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ActivitySample } from "@/lib/activity-detail";

export type NumericSampleKey = "speedKmh" | "cadence" | "power" | "heartRate" | "altitudeMeters";

export function formatElapsed(seconds: number): string {
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
// Tooltip do Recharts e repassar pro resumo compartilhado acima dos
// cards. Atualiza via efeito, não durante o render, pra não mexer no
// estado de um componente pai enquanto este ainda está renderizando.
function TooltipSync({ active, payload, onChange }: TooltipSyncProps) {
  const sample = active && payload && payload.length > 0 ? payload[0].payload : null;

  useEffect(() => {
    onChange(sample);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample?.timestamp, active]);

  return null;
}

interface ActivityMetricCardProps {
  title: string;
  color: string;
  dataKey: NumericSampleKey;
  samples: ActivitySample[];
  syncId: string;
  formatValue: (value: number) => string;
  domain?: [number | string, number | string];
  excludeZero?: boolean; // ignora amostras zeradas (pausas de pedalada) na média/mín/máx
  onActiveChange: (sample: ActivitySample | null) => void;
}

// Card estilo Strava: título grande, gráfico de área preenchida com a cor
// da métrica, e um resumo (média/mínima/máxima) logo abaixo. Tema escuro
// intencional aqui — decisão explícita do usuário pra estes cards,
// diferente do resto do site (claro).
export function ActivityMetricCard({
  title,
  color,
  dataKey,
  samples,
  syncId,
  formatValue,
  domain,
  excludeZero,
  onActiveChange,
}: ActivityMetricCardProps) {
  const values = samples.map((s) => s[dataKey]).filter((v) => !excludeZero || v > 0);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const gradientId = `metric-fill-${dataKey}`;

  return (
    <div className="rounded-2xl bg-neutral-900 p-4 text-neutral-100">
      <h3 className="text-base font-bold">{title}</h3>

      <div className="mt-3 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={samples} syncId={syncId} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="timestamp" tickFormatter={formatElapsed} tick={AXIS_TICK} stroke={GRID_STROKE} minTickGap={40} />
            <YAxis tick={AXIS_TICK} stroke={GRID_STROKE} width={36} domain={domain ?? [0, "dataMax + 10"]} />
            <Tooltip content={<TooltipSync onChange={onActiveChange} />} cursor={CURSOR_STYLE} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-4 border-t border-neutral-800 pt-3 text-sm">
        <div>
          <p className="text-xs text-neutral-400">Média</p>
          <p className="font-semibold">{formatValue(avg)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Mínima</p>
          <p className="font-semibold">{formatValue(min)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Máxima</p>
          <p className="font-semibold">{formatValue(max)}</p>
        </div>
      </div>
    </div>
  );
}
