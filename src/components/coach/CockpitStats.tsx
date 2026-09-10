import type { MockStudent } from "@/lib/mock-data";

interface CockpitStatsProps {
  students: MockStudent[];
}

// Contadores rápidos no topo do cockpit — dão a leitura do dia (quantos já
// treinaram, quantos faltam, quantos estão fora do Strava) sem precisar
// escanear os 15 cards um por um.
export function CockpitStats({ students }: CockpitStatsProps) {
  const done = students.filter((s) => s.todayStatus === "done").length;
  const pending = students.filter((s) => s.todayStatus === "pending").length;
  const missed = students.filter((s) => s.todayStatus === "missed").length;
  const noStrava = students.filter((s) => !s.stravaSynced).length;

  const stats = [
    { label: "Concluíram hoje", value: done, accent: "text-status-done" },
    { label: "Pendentes", value: pending, accent: "text-status-pending" },
    { label: "Perderam o treino", value: missed, accent: "text-status-missed" },
    { label: "Sem Strava", value: noStrava, accent: "text-g4-muted" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-g4-border bg-g4-surface p-4 shadow-sm">
          <p className={`text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
          <p className="mt-1 text-xs font-medium text-g4-muted">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
