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

// Zonas de intensidade por %FTP (padrão Coggan) — as mesmas faixas e nomes
// usados no gráfico de zonas (ZonesChart), para o número bater com o rótulo
// em vez de aparecer solto na linha.
export const ZONES = [
  { key: "Z1", label: "Recuperação", low: 0, high: 55 },
  { key: "Z2", label: "Resistência", low: 56, high: 75 },
  { key: "Z3", label: "Ritmo", low: 76, high: 90 },
  { key: "Z4", label: "Limiar", low: 91, high: 105 },
  { key: "Z5", label: "VO2max", low: 106, high: 150 },
] as const;

function zoneForPct(pct: number): (typeof ZONES)[number] {
  return ZONES.find((z) => pct <= z.high) ?? ZONES[ZONES.length - 1];
}

const fieldClass =
  "w-full rounded-lg border border-g4-border bg-white p-2 text-sm text-g4-ink focus-ring";
const miniLabelClass = "block text-[10px] font-semibold uppercase tracking-wide text-g4-muted";

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
 * é um segmento independente; a duração aqui é sempre em minutos. A zona
 * (Z1–Z5) é derivada do %FTP máximo do bloco — escolher uma zona ajusta a
 * faixa de %FTP automaticamente, e editar o %FTP direto atualiza a zona
 * exibida, sem dois estados para manter sincronizados.
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
        {intervals.map((row, index) => {
          const zone = zoneForPct(row.targetHighPct);

          return (
            <div
              key={index}
              className="grid grid-cols-2 gap-3 rounded-xl border border-g4-border bg-g4-surface-alt/50 p-3 sm:grid-cols-[1.1fr_0.8fr_1fr_0.85fr_0.85fr_auto] sm:items-end sm:gap-2"
            >
              <label className="block">
                <span className={miniLabelClass}>Tipo</span>
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
              </label>

              <label className="block">
                <span className={miniLabelClass}>Duração (min)</span>
                <input
                  type="number"
                  min={0}
                  value={Math.round(row.durationSeconds / 60)}
                  onChange={(e) =>
                    updateRow(index, { durationSeconds: Math.max(0, Number(e.target.value)) * 60 })
                  }
                  className={fieldClass}
                />
              </label>

              <label className="block">
                <span className={miniLabelClass}>Zona</span>
                <select
                  value={zone.key}
                  onChange={(e) => {
                    const next = ZONES.find((z) => z.key === e.target.value) ?? ZONES[0];
                    updateRow(index, { targetLowPct: next.low, targetHighPct: next.high });
                  }}
                  className={fieldClass}
                >
                  {ZONES.map((z) => (
                    <option key={z.key} value={z.key}>
                      {z.key} · {z.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={miniLabelClass}>% FTP mín.</span>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={row.targetLowPct}
                  onChange={(e) => updateRow(index, { targetLowPct: Number(e.target.value) })}
                  className={fieldClass}
                />
              </label>

              <label className="block">
                <span className={miniLabelClass}>% FTP máx.</span>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={row.targetHighPct}
                  onChange={(e) => updateRow(index, { targetHighPct: Number(e.target.value) })}
                  className={fieldClass}
                />
              </label>

              <button
                type="button"
                onClick={() => removeRow(index)}
                aria-label="Remover bloco"
                className="justify-self-end rounded-lg px-2 py-2 text-xs font-medium text-status-missed hover:bg-status-missed/10 sm:justify-self-center"
              >
                Remover
              </button>
            </div>
          );
        })}
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
