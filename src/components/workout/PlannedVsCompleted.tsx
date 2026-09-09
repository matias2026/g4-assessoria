import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  formatDecimal,
  formatDistance,
  formatDuration,
  formatHeartRate,
  formatPaceOrSpeed,
} from "@/lib/workout-metrics";
import type { MockWorkoutDetail } from "@/lib/mock-data";

interface PlannedVsCompletedProps {
  discipline: string;
  planned: MockWorkoutDetail["planned"];
  completed: MockWorkoutDetail["completed"];
}

interface MetricRow {
  label: string;
  planned: string;
  completed: string;
}

// Tabela comparativa Planejado vs. Concluído, no padrão TrainingPeaks, com
// as métricas fundamentais de treino. Ritmo/velocidade é calculado a partir
// de distância + duração de cada coluna.
export function PlannedVsCompleted({ discipline, planned, completed }: PlannedVsCompletedProps) {
  const rows: MetricRow[] = [
    {
      label: "Duração",
      planned: formatDuration(planned.durationSeconds),
      completed: formatDuration(completed?.durationSeconds),
    },
    {
      label: "Distância",
      planned: formatDistance(planned.distanceMeters),
      completed: formatDistance(completed?.distanceMeters),
    },
    {
      label: "TSS",
      planned: formatDecimal(planned.tss, 0),
      completed: formatDecimal(completed?.tss, 0),
    },
    {
      label: "IF",
      planned: formatDecimal(planned.ifScore, 2),
      completed: formatDecimal(completed?.ifScore, 2),
    },
    {
      label: "Ritmo/Velocidade média",
      planned: formatPaceOrSpeed(discipline, planned.distanceMeters, planned.durationSeconds),
      completed: formatPaceOrSpeed(discipline, completed?.distanceMeters, completed?.durationSeconds),
    },
    {
      label: "FC mínima",
      planned: formatHeartRate(planned.hrMin),
      completed: formatHeartRate(completed?.hrMin),
    },
    {
      label: "FC média",
      planned: formatHeartRate(planned.hrAvg),
      completed: formatHeartRate(completed?.hrAvg),
    },
    {
      label: "FC máxima",
      planned: formatHeartRate(planned.hrMax),
      completed: formatHeartRate(completed?.hrMax),
    },
  ];

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5">
        <CardTitle>Planejado vs. Concluído</CardTitle>
        {completed && (
          <Badge tone="lime">{completed.source === "strava" ? "Via Strava" : "Lançado manualmente"}</Badge>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-g4-surface-alt text-g4-muted">
            <tr>
              <th className="px-5 py-2.5 font-medium">Métrica</th>
              <th className="px-5 py-2.5 font-medium">Planejado</th>
              <th className="px-5 py-2.5 font-medium">Concluído</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-g4-border">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="px-5 py-2.5 text-g4-muted">{row.label}</td>
                <td className="px-5 py-2.5 font-medium text-g4-ink">{row.planned}</td>
                <td className="px-5 py-2.5 font-medium text-g4-ink">{row.completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
