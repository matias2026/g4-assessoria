import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  compareToPlanned,
  formatDecimal,
  formatDistance,
  formatDuration,
  formatHeartRate,
  formatPaceOrSpeed,
  paceOrSpeedValue,
  type PlanComparison,
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
  comparison: PlanComparison;
}

// Cor do valor "Concluído" conforme a comparação com o planejado: azul
// dentro da tolerância, vermelho fora do esperado, neutro sem dado ainda.
const COMPARISON_TEXT_CLASS: Record<PlanComparison, string> = {
  match: "text-blue-600",
  off: "text-red-600",
  none: "text-g4-ink",
};

// Tabela comparativa Planejado vs. Concluído, no padrão TrainingPeaks, com
// as métricas fundamentais de treino. Ritmo/velocidade é calculado a partir
// de distância + duração de cada coluna.
export function PlannedVsCompleted({ discipline, planned, completed }: PlannedVsCompletedProps) {
  const rows: MetricRow[] = [
    {
      label: "Duração",
      planned: formatDuration(planned.durationSeconds),
      completed: formatDuration(completed?.durationSeconds),
      comparison: compareToPlanned(planned.durationSeconds, completed?.durationSeconds),
    },
    {
      label: "Distância",
      planned: formatDistance(planned.distanceMeters),
      completed: formatDistance(completed?.distanceMeters),
      comparison: compareToPlanned(planned.distanceMeters, completed?.distanceMeters),
    },
    {
      label: "TSS",
      planned: formatDecimal(planned.tss, 0),
      completed: formatDecimal(completed?.tss, 0),
      comparison: compareToPlanned(planned.tss, completed?.tss),
    },
    {
      label: "IF",
      planned: formatDecimal(planned.ifScore, 2),
      completed: formatDecimal(completed?.ifScore, 2),
      comparison: compareToPlanned(planned.ifScore, completed?.ifScore),
    },
    {
      label: "Ritmo/Velocidade média",
      planned: formatPaceOrSpeed(discipline, planned.distanceMeters, planned.durationSeconds),
      completed: formatPaceOrSpeed(discipline, completed?.distanceMeters, completed?.durationSeconds),
      comparison: compareToPlanned(
        paceOrSpeedValue(discipline, planned.distanceMeters, planned.durationSeconds),
        paceOrSpeedValue(discipline, completed?.distanceMeters, completed?.durationSeconds)
      ),
    },
    {
      label: "FC mínima",
      planned: formatHeartRate(planned.hrMin),
      completed: formatHeartRate(completed?.hrMin),
      comparison: compareToPlanned(planned.hrMin, completed?.hrMin),
    },
    {
      label: "FC média",
      planned: formatHeartRate(planned.hrAvg),
      completed: formatHeartRate(completed?.hrAvg),
      comparison: compareToPlanned(planned.hrAvg, completed?.hrAvg),
    },
    {
      label: "FC máxima",
      planned: formatHeartRate(planned.hrMax),
      completed: formatHeartRate(completed?.hrMax),
      comparison: compareToPlanned(planned.hrMax, completed?.hrMax),
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

      {/* Mobile: card por métrica — evita colunas espremidas cortando texto
          (ex.: "Ritmo/Velocidade média") numa tabela de 3 colunas estreita. */}
      <div className="flex flex-col gap-4 p-4 sm:hidden">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border border-g4-border p-3">
            <p className="text-xs font-medium text-g4-muted">{row.label}</p>
            <div className="mt-1.5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-g4-muted">Planejado</p>
                <p className="font-medium text-g4-ink">{row.planned}</p>
              </div>
              <div>
                <p className="text-[11px] text-g4-muted">Concluído</p>
                <p className={cn("font-medium", COMPARISON_TEXT_CLASS[row.comparison])}>{row.completed}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block sm:mt-4">
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
                <td className={cn("px-5 py-2.5 font-medium", COMPARISON_TEXT_CLASS[row.comparison])}>
                  {row.completed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
