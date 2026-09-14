import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { hrZoneRange, type HrZone } from "@/lib/hr-zones";
import type {
  IntervalCadenceTarget,
  IntervalHrTarget,
  IntervalPowerTarget,
  WorkoutInterval,
  WorkoutIntervalType,
} from "@/lib/supabase/types";

interface IntervalEditorProps {
  intervals: WorkoutInterval[];
  onChange: (intervals: WorkoutInterval[]) => void;
  // Potência (%FTP) só existe pra ciclismo — a ficha de corrida não tem FTP
  // cadastrado, então o toggle nem aparece pra não sugerir um dado que não
  // existe. Default true (ciclismo é o caller mais comum/histórico).
  showPower?: boolean;
  // FC máx/repouso do aluno (cycling_profile ?? running_profile, mesmo
  // fallback de src/lib/monitoring.ts) — usadas só pra mostrar o bpm
  // calculado da zona escolhida; null não bloqueia escolher a zona, só
  // esconde o bpm de referência.
  hrMax?: number | null;
  hrRest?: number | null;
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
// em vez de aparecer solto na linha. Não confundir com as zonas de FC
// (Z1-Z5 também, mas por %reserva cardíaca — ver src/lib/hr-zones.ts):
// são duas escalas independentes que só coincidem no nome "Z1..Z5".
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

const HR_ZONES: { zone: HrZone; label: string }[] = [
  { zone: 1, label: "Z1 · Recuperação" },
  { zone: 2, label: "Z2 · Leve" },
  { zone: 3, label: "Z3 · Moderado" },
  { zone: 4, label: "Z4 · Forte" },
  { zone: 5, label: "Z5 · Máximo" },
];

const DEFAULT_POWER: IntervalPowerTarget = { lowPct: 70, highPct: 70 };
const DEFAULT_HR: IntervalHrTarget = { zone: 3 };
const DEFAULT_CADENCE: IntervalCadenceTarget = { low: 85, high: 95 };

const EMPTY_INTERVAL: WorkoutInterval = {
  type: "interval",
  durationSeconds: 5 * 60,
  power: { ...DEFAULT_POWER },
  hr: null,
  cadence: null,
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-g4-border bg-g4-surface p-2 text-sm text-g4-ink focus-ring";
const miniLabelClass = "block text-[11px] font-semibold uppercase tracking-wide text-g4-muted";
const chipClass =
  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-ring";

/**
 * Editor dos blocos estruturados de treino (aquecimento, tiros, recuperação,
 * desaquecimento) — ciclismo e corrida. Cada bloco combina um ou mais
 * alvos independentes (Potência, Frequência cardíaca, Cadência) via os
 * chips logo abaixo de Tipo/Duração; um bloco pode ter os três ao mesmo
 * tempo (ex.: "sprint a 180bpm com cadência a 100rpm"). A zona de FC não é
 * digitada em bpm — o app calcula o bpm da zona escolhida a partir da FC
 * máx/repouso cadastrada na ficha desse aluno (mesma fórmula do
 * Monitoramento), então a prescrição continua certa mesmo se a ficha for
 * atualizada depois.
 */
export function IntervalEditor({ intervals, onChange, showPower = true, hrMax = null, hrRest = null }: IntervalEditorProps) {
  function updateRow(index: number, patch: Partial<WorkoutInterval>) {
    onChange(intervals.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(intervals.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...intervals, { ...EMPTY_INTERVAL, power: showPower ? { ...DEFAULT_POWER } : null }]);
  }

  function toggleTarget(index: number, row: WorkoutInterval, kind: "power" | "hr" | "cadence") {
    if (kind === "power") {
      updateRow(index, { power: row.power ? null : { ...DEFAULT_POWER } });
    } else if (kind === "hr") {
      updateRow(index, { hr: row.hr ? null : { ...DEFAULT_HR } });
    } else {
      updateRow(index, { cadence: row.cadence ? null : { ...DEFAULT_CADENCE } });
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-col gap-4">
        {intervals.map((row, index) => (
          <div key={index} className="rounded-2xl border border-g4-border bg-g4-surface-alt/60 p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-[1.3fr_1fr_auto] lg:items-end">
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
                  onChange={(e) => updateRow(index, { durationSeconds: Math.max(0, Number(e.target.value)) * 60 })}
                  className={fieldClass}
                />
              </label>

              <button
                type="button"
                onClick={() => removeRow(index)}
                aria-label="Remover bloco"
                className="col-span-2 rounded-lg border border-status-missed/30 px-2 py-2 text-xs font-medium text-status-missed hover:bg-status-missed/10 lg:col-span-1 lg:border-0 lg:justify-self-center"
              >
                Remover
              </button>
            </div>

            {/* Chips: um bloco pode combinar mais de um alvo ao mesmo tempo —
                cada chip liga/desliga seu mini-formulário abaixo, sem afetar
                os outros alvos já ativos. */}
            <div className="mt-3 flex flex-wrap gap-4">
              {showPower && (
                <button
                  type="button"
                  onClick={() => toggleTarget(index, row, "power")}
                  className={cn(chipClass, row.power ? "border-lime bg-lime/15 text-lime-deep" : "border-g4-border text-g4-muted hover:bg-g4-surface")}
                >
                  ⚡ Potência
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleTarget(index, row, "hr")}
                className={cn(chipClass, row.hr ? "border-lime bg-lime/15 text-lime-deep" : "border-g4-border text-g4-muted hover:bg-g4-surface")}
              >
                ♥ Frequência cardíaca
              </button>
              <button
                type="button"
                onClick={() => toggleTarget(index, row, "cadence")}
                className={cn(chipClass, row.cadence ? "border-lime bg-lime/15 text-lime-deep" : "border-g4-border text-g4-muted hover:bg-g4-surface")}
              >
                🔄 Cadência
              </button>
            </div>

            {/* Alvo: Potência */}
            {row.power && (
              <div className="mt-3 grid grid-cols-2 gap-4 border-t border-g4-border pt-3 lg:grid-cols-3">
                <label className="block">
                  <span className={miniLabelClass}>Zona (%FTP)</span>
                  <select
                    value={zoneForPct(row.power.highPct).key}
                    onChange={(e) => {
                      const next = ZONES.find((z) => z.key === e.target.value) ?? ZONES[0];
                      updateRow(index, { power: { lowPct: next.low, highPct: next.high } });
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
                    value={row.power.lowPct}
                    onChange={(e) => updateRow(index, { power: { ...row.power!, lowPct: Number(e.target.value) } })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className={miniLabelClass}>% FTP máx.</span>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={row.power.highPct}
                    onChange={(e) => updateRow(index, { power: { ...row.power!, highPct: Number(e.target.value) } })}
                    className={fieldClass}
                  />
                </label>
              </div>
            )}

            {/* Alvo: Frequência cardíaca — zona, não bpm digitado à mão. */}
            {row.hr && (
              <div className="mt-3 border-t border-g4-border pt-3">
                <label className="block max-w-xs">
                  <span className={miniLabelClass}>Zona de FC</span>
                  <select
                    value={row.hr.zone}
                    onChange={(e) => updateRow(index, { hr: { zone: Number(e.target.value) as HrZone } })}
                    className={fieldClass}
                  >
                    {HR_ZONES.map((z) => (
                      <option key={z.zone} value={z.zone}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                </label>
                {(() => {
                  const range = hrZoneRange(row.hr.zone, hrRest, hrMax);
                  return range ? (
                    <p className="mt-1.5 text-xs text-g4-muted">
                      ≈ {range.low}–{range.high} bpm pra esse aluno (calculado da ficha).
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-g4-muted">
                      Cadastre FC máxima e de repouso na ficha do aluno pra ver o bpm dessa zona.
                    </p>
                  );
                })()}
              </div>
            )}

            {/* Alvo: Cadência */}
            {row.cadence && (
              <div className="mt-3 grid grid-cols-2 gap-4 border-t border-g4-border pt-3 sm:max-w-xs">
                <label className="block">
                  <span className={miniLabelClass}>Cadência mín.</span>
                  <input
                    type="number"
                    min={0}
                    value={row.cadence.low}
                    onChange={(e) => updateRow(index, { cadence: { ...row.cadence!, low: Number(e.target.value) } })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className={miniLabelClass}>Cadência máx.</span>
                  <input
                    type="number"
                    min={0}
                    value={row.cadence.high}
                    onChange={(e) => updateRow(index, { cadence: { ...row.cadence!, high: Number(e.target.value) } })}
                    className={fieldClass}
                  />
                </label>
              </div>
            )}

            {!row.power && !row.hr && !row.cadence && (
              <p className="mt-3 border-t border-g4-border pt-3 text-xs text-g4-muted">
                Sem alvo definido pra esse bloco — escolha pelo menos um acima.
              </p>
            )}
          </div>
        ))}
      </div>

      <Button variant="secondary" className="mt-3 px-4 text-sm" onClick={addRow}>
        + Adicionar bloco
      </Button>

      {intervals.length === 0 && (
        <p className="mt-2 text-xs text-g4-muted">
          Nenhum bloco cadastrado — adicione ao menos um pra liberar o teste no dispositivo (.FIT).
        </p>
      )}
    </div>
  );
}
