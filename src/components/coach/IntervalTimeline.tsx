import { TYPE_LABELS } from "@/components/workout/IntervalEditor";
import type { WorkoutInterval } from "@/lib/supabase/types";

interface IntervalTimelineProps {
  intervals: WorkoutInterval[];
}

// Cor por intensidade: potência (%FTP) manda quando presente, senão a zona
// de FC, senão nenhuma cor de intensidade (bloco só com cadência, ou sem
// nenhum alvo) — cinza neutro, não inventa uma intensidade que não foi
// definida.
function colorFor(interval: WorkoutInterval): string {
  if (interval.power) {
    const pct = interval.power.highPct;
    if (pct >= 85) return "bg-red-600"; // Intenso
    if (pct >= 60) return "bg-yellow-400"; // Moderado
    return "bg-blue-500"; // Leve
  }
  if (interval.hr) {
    if (interval.hr.zone >= 4) return "bg-red-600";
    if (interval.hr.zone >= 3) return "bg-yellow-400";
    return "bg-blue-500";
  }
  return "bg-g4-border";
}

// Descreve os alvos combinados de um bloco (ex.: "50-70% FTP · FC Z4 ·
// 90-100 rpm") — junta só os que estão presentes, na mesma ordem dos chips
// do editor (Potência/FC/Cadência).
function targetLabel(interval: WorkoutInterval): string {
  const parts: string[] = [];
  if (interval.power) parts.push(`${interval.power.lowPct}-${interval.power.highPct}% FTP`);
  if (interval.hr) parts.push(`FC Z${interval.hr.zone}`);
  if (interval.cadence) parts.push(`cadência ${interval.cadence.low}-${interval.cadence.high}`);
  return parts.length > 0 ? parts.join(" · ") : "sem alvo definido";
}

// Gráfico de blocos do treino: cada segmento é proporcional à duração e
// colorido pela intensidade (potência, ou FC quando não há potência) —
// Leve (azul), Moderado (amarelo intenso) e Intenso (vermelho forte).
export function IntervalTimeline({ intervals }: IntervalTimelineProps) {
  if (intervals.length === 0) return null;

  const total = intervals.reduce((sum, i) => sum + i.durationSeconds, 0);

  return (
    <div>
      <div className="flex h-7 w-full overflow-hidden rounded-lg border border-g4-border">
        {intervals.map((interval, index) => (
          <div
            key={index}
            title={`${TYPE_LABELS[interval.type]} · ${Math.round(interval.durationSeconds / 60)}min · ${targetLabel(interval)}`}
            className={colorFor(interval)}
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
