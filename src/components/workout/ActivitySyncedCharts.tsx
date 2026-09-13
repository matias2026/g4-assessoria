"use client";

import { useState } from "react";
import { ActivityMetricCard, formatElapsed, type NumericSampleKey } from "./ActivityMetricCard";
import type { ActivitySample } from "@/lib/activity-detail";

interface ActivitySyncedChartsProps {
  samples: ActivitySample[];
  elevationGainMeters: number;
}

interface MetricConfig {
  key: NumericSampleKey;
  title: string;
  color: string;
  excludeZero: boolean;
  domain?: [number | string, number | string];
  format: (value: number) => string;
}

// Ordem e cores seguem o print de referência (Strava): Velocidade primeiro,
// depois Cadência/Potência/FC/Altitude — cores mantidas das já escolhidas
// antes (cadência roxo, potência laranja, FC rosa/vermelho, altitude
// cinza), com azul pra velocidade (nova).
const METRICS: MetricConfig[] = [
  {
    key: "speedKmh",
    title: "Velocidade",
    color: "#38bdf8",
    excludeZero: false,
    format: (v) => `${v.toFixed(1)} km/h`,
  },
  {
    key: "cadence",
    title: "Cadência",
    color: "#c026d3",
    excludeZero: true,
    format: (v) => `${Math.round(v)} rpm`,
  },
  {
    key: "power",
    title: "Potência",
    color: "#f97316",
    excludeZero: true,
    format: (v) => `${Math.round(v)} W`,
  },
  {
    key: "heartRate",
    title: "Frequência cardíaca",
    color: "#f43f5e",
    excludeZero: false,
    format: (v) => `${Math.round(v)} bpm`,
  },
  {
    key: "altitudeMeters",
    title: "Elevação",
    color: "#94a3b8",
    excludeZero: false,
    domain: ["dataMin - 5", "dataMax + 5"],
    format: (v) => `${Math.round(v)} m`,
  },
];

/**
 * Um card por métrica (Velocidade, Cadência, Potência, Frequência
 * cardíaca, Altitude), estilo Strava — gráfico de área preenchida + média/
 * mínima/máxima abaixo. Todos compartilham o mesmo eixo X e o mesmo
 * `syncId` do Recharts: passar o mouse em qualquer um move o cursor em
 * todos e atualiza o resumo no topo com os valores exatos daquele
 * instante ao mesmo tempo.
 */
export function ActivitySyncedCharts({ samples, elevationGainMeters }: ActivitySyncedChartsProps) {
  const [activeSample, setActiveSample] = useState<ActivitySample | null>(null);
  const active = activeSample ?? samples[samples.length - 1];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-4 rounded-xl bg-neutral-900 p-3 text-sm text-neutral-100">
        <span className="text-neutral-400">{formatElapsed(active.timestamp)}</span>
        {METRICS.map((metric) => (
          <span key={metric.key}>
            {metric.title}{" "}
            <span className="font-semibold" style={{ color: metric.color }}>
              {metric.format(active[metric.key])}
            </span>
          </span>
        ))}
      </div>

      {METRICS.map((metric) => (
        <ActivityMetricCard
          key={metric.key}
          title={metric.title}
          color={metric.color}
          dataKey={metric.key}
          samples={samples}
          syncId="activity-detail"
          formatValue={metric.format}
          domain={metric.domain}
          excludeZero={metric.excludeZero}
          primaryStat={
            metric.key === "altitudeMeters"
              ? { label: "Ganho de elevação", value: `${elevationGainMeters} m` }
              : undefined
          }
          onActiveChange={setActiveSample}
        />
      ))}
    </div>
  );
}
