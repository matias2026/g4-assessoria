import { Card, CardTitle } from "@/components/ui/Card";
import { ActivityStatsGrid } from "./ActivityStatsGrid";
import { ActivitySyncedCharts } from "./ActivitySyncedCharts";
import type { ActivityDetail } from "@/lib/activity-detail";

interface ActivityDetailViewProps {
  activity: ActivityDetail;
}

export function ActivityDetailView({ activity }: ActivityDetailViewProps) {
  return (
    <Card>
      <CardTitle>Detalhe da atividade</CardTitle>
      <div className="mt-3 flex flex-col gap-4">
        <ActivityStatsGrid activity={activity} />
        <div className="border-t border-g4-border" />
        <ActivitySyncedCharts samples={activity.samples} />
      </div>
    </Card>
  );
}
