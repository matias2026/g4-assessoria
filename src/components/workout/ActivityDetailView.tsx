import { ActivityStatsGrid } from "./ActivityStatsGrid";
import { ActivitySyncedCharts } from "./ActivitySyncedCharts";
import type { ActivityDetail } from "@/lib/activity-detail";

interface ActivityDetailViewProps {
  activity: ActivityDetail;
}

// Painel escuro estilo Intervals.icu — modo escuro intencional e isolado
// deste componente; o resto do site segue o tema claro (TrainingPeaks).
export function ActivityDetailView({ activity }: ActivityDetailViewProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-neutral-900 p-4 text-neutral-100 sm:p-5">
      <ActivityStatsGrid activity={activity} />
      <div className="border-t border-neutral-800" />
      <ActivitySyncedCharts samples={activity.samples} />
    </div>
  );
}
