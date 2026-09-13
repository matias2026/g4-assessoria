import { Card, CardTitle } from "@/components/ui/Card";
import { ActivityStatsGrid } from "./ActivityStatsGrid";
import { ActivitySyncedCharts } from "./ActivitySyncedCharts";
import type { ActivityDetail } from "@/lib/activity-detail";

interface ActivityDetailViewProps {
  activity: ActivityDetail;
}

// Resumo (Card claro) e gráficos (cards escuros) ficam lado a lado no
// fluxo, não um aninhado dentro do outro — dois níveis de padding
// somados (card claro + card escuro) deixavam os gráficos mais estreitos
// que o resto da aba (ex.: Zonas de potência, que é um único card).
export function ActivityDetailView({ activity }: ActivityDetailViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>Detalhe da atividade</CardTitle>
        <div className="mt-3">
          <ActivityStatsGrid activity={activity} />
        </div>
      </Card>
      <ActivitySyncedCharts samples={activity.samples} elevationGainMeters={activity.elevationGainMeters} />
    </div>
  );
}
