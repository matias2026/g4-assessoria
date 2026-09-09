import { Button } from "@/components/ui/Button";
import type { WorkoutInterval, WorkoutIntervalType } from "@/lib/supabase/types";

interface IntervalEditorProps {
  intervals: WorkoutInterval[];
  onChange: (intervals: WorkoutInterval[]) => void;
}

export const TYPE_LABELS: Record<WorkoutIntervalType, string> = {
  warmup: "Aquecimento",
  steady: "Ritmo constante",
  interval: "Tiro",
  recovery: "Recuperação",
  cooldown: "Desaquecimento",
};

const fieldClass =
  "w-full rounded-lg border border-g4-border bg-white p-2 text-sm text-g4-ink focus-ring";

const EMPTY_INTERVAL: WorkoutInterval = {
  type: "interval",
  durationSeconds: 5 * 60,
  targetLowPct: 90,
  targetHighPct: 90,
};

/**
 * Editor dos blocos estruturados por %FTP/zona (aquecimento, tiros,
 * recuperação, desaquecimento) — a mesma lista que alimenta o export .ZWO
 * (`src/lib/workout-export.ts`), então só aparece para ciclismo. Cada linha
 * é um segmento independente; a duração aqui é sempre em minutos.
 */
export function IntervalEditor({ intervals, onChange }: IntervalEditorProps) {
  function updateRow(index: number, patch: Partial<WorkoutInterval>) {
    onChange(intervals.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(intervals.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...intervals, { ...EMPTY_INTERVAL }]);
  }

  return (
    <div className="mt-3">
      <div className="flex flex-col gap-2">
        {intervals.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-2 gap-2 rounded-xl border border-g4-border bg-g4-surface-alt/50 p-3 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto] sm:items-center"
          >
            <select
              value={row.type}
              onChange={(e) => updateRow(index, { type: e.target.value as WorkoutIntervalType })}
              className={fieldClass}
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <label className="block">
              <span className="sr-only">Duração (min)</span>
              <input
                type="number"
                min={0}
                value={Math.round(row.durationSeconds / 60)}
                onChange={(e) =>
                  updateRow(index, { durationSeconds: Math.max(0, Number(e.target.value)) * 60 })
                }
                placeholder="Min"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="sr-only">% FTP mínimo</span>
              <input
                type="number"
                min={0}
                max={200}
                value={row.targetLowPct}
                onChange={(e) => updateRow(index, { targetLowPct: Number(e.target.value) })}
                placeholder="% FTP mín."
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="sr-only">% FTP máximo</span>
              <input
                type="number"
                min={0}
                max={200}
                value={row.targetHighPct}
                onChange={(e) => updateRow(index, { targetHighPct: Number(e.target.value) })}
                placeholder="% FTP máx."
                className={fieldClass}
              />
            </label>

            <button
              type="button"
              onClick={() => removeRow(index)}
              aria-label="Remover bloco"
              className="justify-self-end rounded-lg px-2 py-1 text-sm text-status-missed hover:bg-status-missed/10 sm:justify-self-center"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <Button variant="secondary" className="mt-3 px-4 text-sm" onClick={addRow}>
        + Adicionar bloco
      </Button>

      {intervals.length === 0 && (
        <p className="mt-2 text-xs text-g4-muted">
          Nenhum bloco cadastrado — adicione ao menos um para liberar a exportação .ZWO.
        </p>
      )}
    </div>
  );
}
