import { TYPE_LABELS } from "@/components/workout/IntervalEditor";
import type { WorkoutInterval } from "@/lib/supabase/types";

interface IntervalTimelineProps {
  intervals: WorkoutInterval[];
}

function colorFor(pct: number): string {
  if (pct >= 85) return "bg-red-600"; // Intenso
  if (pct >= 60) return "bg-yellow-400"; // Moderado
  return "bg-blue-500"; // Leve
}

// Gráfico de blocos do treino: cada segmento é proporcional à duração e
// colorido pela intensidade (%FTP) — Leve (azul), Moderado (amarelo
// intenso) e Intenso (vermelho forte).
export function IntervalTimeline({ intervals }: IntervalTimelineProps) {
  if (intervals.length === 0) return null;

  const total = intervals.reduce((sum, i) => sum + i.durationSeconds, 0);

  return (
    <div>
      <div className="flex h-7 w-full overflow-hidden rounded-lg border border-g4-border">
        {intervals.map((interval, index) => (
          <div
            key={index}
            title={`${TYPE_LABELS[interval.type]} · ${Math.round(interval.durationSeconds / 60)}min · ${interval.targetHighPct}% FTP`}
            className={colorFor(interval.targetHighPct)}
            style={{ width: `${(interval.durationSeconds / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-g4-muted">
        <span className="inline-flex items-center gap-4">
          <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
          Leve
        </span>
        <span className="inline-flex items-center gap-4">
          <span className="h-2 w-2 rounded-full bg-yellow-400" aria-hidden />
          Moderado
        </span>
        <span className="inline-flex items-center gap-4">
          <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden />
          Intenso
        </span>
      </div>
    </div>
  );
}
