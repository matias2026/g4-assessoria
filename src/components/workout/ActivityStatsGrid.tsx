import { Avatar } from "@/components/ui/Avatar";
import type { ActivityDetail } from "@/lib/activity-detail";

interface ActivityStatsGridProps {
  activity: ActivityDetail;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

// Cabeçalho de métricas: identificação da atividade + grid de estatísticas
// consolidadas, no padrão Intervals.icu.
export function ActivityStatsGrid({ activity }: ActivityStatsGridProps) {
  const stats = [
    { label: "Distância", value: `${activity.distanceKm.toFixed(2)} km` },
    { label: "Tempo total", value: formatDuration(activity.durationSeconds) },
    { label: "Velocidade média", value: `${activity.avgSpeedKmh.toFixed(1)} km/h` },
    { label: "Ganho de elevação", value: `${activity.elevationGainMeters} m` },
    { label: "Cadência média", value: `${activity.avgCadence} rpm` },
    { label: "Calorias", value: `${activity.calories} kcal` },
    { label: "Peso", value: `${activity.weightKg.toFixed(1)} kg` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar name={activity.athleteName} className="h-10 w-10 text-sm" />
        <div>
          <p className="text-sm font-medium text-neutral-100">
            {activity.date} · {activity.startTime}
          </p>
          <p className="text-xs text-neutral-400">{activity.type}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-neutral-800 p-3">
            <p className="text-[11px] uppercase tracking-wide text-neutral-400">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold text-neutral-50">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
