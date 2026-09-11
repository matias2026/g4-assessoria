"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { BodyComposition, CyclingProfile, MockStudent, RunningProfile, StrengthGoal, StrengthProfile, StudentSex } from "@/lib/mock-data";

interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
  onAddStudent: (student: MockStudent) => void;
}

const DISCIPLINES = ["Ciclismo", "Corrida", "Academia"];
const SEX_OPTIONS: StudentSex[] = ["Masculino", "Feminino", "Outro"];
const STRENGTH_GOALS: StrengthGoal[] = ["Hipertrofia", "Emagrecimento", "Fortalecimento para endurance"];

const fieldClass =
  "mt-1 w-full rounded-xl border border-g4-border bg-white p-2.5 text-sm text-g4-ink focus-ring";
const labelClass = "text-xs font-medium text-g4-muted";
const sectionClass = "rounded-2xl border border-g4-border bg-g4-surface-alt/40 p-4";
const summaryClass = "cursor-pointer text-sm font-semibold text-g4-ink marker:text-lime-deep";
const subSectionClass = "mt-3 rounded-xl border border-g4-border bg-white/60 p-3";

function numOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

interface GeneralFields {
  name: string;
  phone: string;
  age: string;
  sex: StudentSex | "";
  heightCm: string;
  weightKg: string;
  bodyFatPct: string;
  muscleMassKg: string;
  waistCm: string;
  weightHistoryNotes: string;
  medicalNotes: string;
}

interface CyclingFields {
  ftpWatts: string;
  hrMax: string;
  hrRest: string;
  hrThreshold: string;
  preferredCadence: string;
  peakPowerShort: string;
  peakPowerLong: string;
  mtbNotes: string;
}

interface RunningFields {
  thresholdPace: string;
  vo2max: string;
  hrMax: string;
  hrThreshold: string;
  pr5k: string;
  pr10k: string;
  prHalfMarathon: string;
  cadence: string;
  strideLengthCm: string;
  verticalOscillationCm: string;
}

interface StrengthFields {
  goal: StrengthGoal | "";
  squat1RM: string;
  deadlift1RM: string;
  benchPress1RM: string;
  legPress1RM: string;
  focusNotes: string;
  asymmetryNotes: string;
}

const BLANK_GENERAL: GeneralFields = {
  name: "",
  phone: "",
  age: "",
  sex: "",
  heightCm: "",
  weightKg: "",
  bodyFatPct: "",
  muscleMassKg: "",
  waistCm: "",
  weightHistoryNotes: "",
  medicalNotes: "",
};
const BLANK_CYCLING: CyclingFields = {
  ftpWatts: "",
  hrMax: "",
  hrRest: "",
  hrThreshold: "",
  preferredCadence: "",
  peakPowerShort: "",
  peakPowerLong: "",
  mtbNotes: "",
};
const BLANK_RUNNING: RunningFields = {
  thresholdPace: "",
  vo2max: "",
  hrMax: "",
  hrThreshold: "",
  pr5k: "",
  pr10k: "",
  prHalfMarathon: "",
  cadence: "",
  strideLengthCm: "",
  verticalOscillationCm: "",
};
const BLANK_STRENGTH: StrengthFields = {
  goal: "",
  squat1RM: "",
  deadlift1RM: "",
  benchPress1RM: "",
  legPress1RM: "",
  focusNotes: "",
  asymmetryNotes: "",
};

/**
 * Modal de cadastro de aluno: dados corporais gerais + seções específicas
 * por modalidade (Ciclismo/Corrida/Academia), mostradas só quando a
 * modalidade principal ou uma adicional está selecionada — em accordions
 * (<details>) para o treinador preencher só o que for relevante, sem
 * poluir a tela com ~35 campos de uma vez. TODO: persistir via Supabase
 * quando o projeto estiver conectado (hoje só entra em memória).
 */
export function AddStudentModal({ open, onClose, onAddStudent }: AddStudentModalProps) {
  const [general, setGeneral] = useState<GeneralFields>(BLANK_GENERAL);
  const [primaryDiscipline, setPrimaryDiscipline] = useState(DISCIPLINES[0]);
  const [secondaryDisciplines, setSecondaryDisciplines] = useState<string[]>([]);
  const [cycling, setCycling] = useState<CyclingFields>(BLANK_CYCLING);
  const [running, setRunning] = useState<RunningFields>(BLANK_RUNNING);
  const [strength, setStrength] = useState<StrengthFields>(BLANK_STRENGTH);

  if (!open) return null;

  const practiced = [primaryDiscipline, ...secondaryDisciplines];
  const isCycling = practiced.includes("Ciclismo");
  const isRunning = practiced.includes("Corrida");
  const isStrength = practiced.includes("Academia");

  const ftpNum = Number(cycling.ftpWatts);
  const weightNum = Number(general.weightKg);
  const wattsPerKg = ftpNum > 0 && weightNum > 0 ? (ftpNum / weightNum).toFixed(2) : null;

  function patchGeneral(patch: Partial<GeneralFields>) {
    setGeneral((prev) => ({ ...prev, ...patch }));
  }
  function patchCycling(patch: Partial<CyclingFields>) {
    setCycling((prev) => ({ ...prev, ...patch }));
  }
  function patchRunning(patch: Partial<RunningFields>) {
    setRunning((prev) => ({ ...prev, ...patch }));
  }
  function patchStrength(patch: Partial<StrengthFields>) {
    setStrength((prev) => ({ ...prev, ...patch }));
  }

  function handlePrimaryChange(next: string) {
    setPrimaryDiscipline(next);
    setSecondaryDisciplines((prev) => prev.filter((d) => d !== next));
  }

  function toggleSecondary(discipline: string) {
    setSecondaryDisciplines((prev) =>
      prev.includes(discipline) ? prev.filter((d) => d !== discipline) : [...prev, discipline]
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!general.name.trim() || !general.phone.trim()) return;

    const cyclingProfile: CyclingProfile | null = isCycling
      ? {
          ftpWatts: numOrNull(cycling.ftpWatts),
          hrMax: numOrNull(cycling.hrMax),
          hrRest: numOrNull(cycling.hrRest),
          hrThreshold: numOrNull(cycling.hrThreshold),
          preferredCadence: numOrNull(cycling.preferredCadence),
          peakPowerShort: numOrNull(cycling.peakPowerShort),
          peakPowerLong: numOrNull(cycling.peakPowerLong),
          mtbNotes: cycling.mtbNotes.trim(),
        }
      : null;

    const runningProfile: RunningProfile | null = isRunning
      ? {
          thresholdPace: running.thresholdPace.trim(),
          vo2max: numOrNull(running.vo2max),
          hrMax: numOrNull(running.hrMax),
          hrThreshold: numOrNull(running.hrThreshold),
          pr5k: running.pr5k.trim(),
          pr10k: running.pr10k.trim(),
          prHalfMarathon: running.prHalfMarathon.trim(),
          cadence: numOrNull(running.cadence),
          strideLengthCm: numOrNull(running.strideLengthCm),
          verticalOscillationCm: numOrNull(running.verticalOscillationCm),
        }
      : null;

    const strengthProfile: StrengthProfile | null = isStrength
      ? {
          goal: strength.goal || null,
          squat1RM: numOrNull(strength.squat1RM),
          deadlift1RM: numOrNull(strength.deadlift1RM),
          benchPress1RM: numOrNull(strength.benchPress1RM),
          legPress1RM: numOrNull(strength.legPress1RM),
          focusNotes: strength.focusNotes.trim(),
          asymmetryNotes: strength.asymmetryNotes.trim(),
        }
      : null;

    const bodyComposition: BodyComposition = {
      bodyFatPct: numOrNull(general.bodyFatPct),
      muscleMassKg: numOrNull(general.muscleMassKg),
      waistCm: numOrNull(general.waistCm),
    };

    onAddStudent({
      id: String(Date.now()),
      name: general.name.trim(),
      phone: general.phone.trim(),
      discipline: primaryDiscipline,
      secondaryDisciplines,
      age: numOrNull(general.age),
      sex: general.sex || null,
      heightCm: numOrNull(general.heightCm),
      weightKg: numOrNull(general.weightKg),
      bodyComposition,
      weightHistoryNotes: general.weightHistoryNotes.trim(),
      medicalNotes: general.medicalNotes.trim(),
      cycling: cyclingProfile,
      running: runningProfile,
      strength: strengthProfile,
      todayStatus: "pending",
      stravaSynced: false,
      lastActivity: null,
    });

    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cadastrar novo aluno"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-g4-surface shadow-lg sm:max-w-2xl sm:rounded-2xl"
      >
        {/* Cabeçalho fixo (fora da área de rolagem) — em vez de rolar junto
            com o formulário, o que fazia o título sumir/cortar no topo
            (pior ainda com a barra do Safari no iOS). */}
        <div className="flex shrink-0 items-center justify-between border-b border-g4-border p-5">
          <h2 className="text-lg font-bold text-g4-ink">Novo aluno</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg px-2 py-1 text-g4-muted hover:bg-g4-surface-alt"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-5">
          {/* Dados gerais */}
          <details open className={sectionClass}>
            <summary className={summaryClass}>Dados gerais</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Nome</span>
                <input
                  value={general.name}
                  onChange={(e) => patchGeneral({ name: e.target.value })}
                  required
                  className={fieldClass}
                  placeholder="Nome completo"
                />
              </label>
              <label className="block">
                <span className={labelClass}>WhatsApp</span>
                <input
                  value={general.phone}
                  onChange={(e) => patchGeneral({ phone: e.target.value })}
                  required
                  className={fieldClass}
                  placeholder="+55 84 99999-0000"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Idade</span>
                <input
                  type="number"
                  min={0}
                  value={general.age}
                  onChange={(e) => patchGeneral({ age: e.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Sexo</span>
                <select
                  value={general.sex}
                  onChange={(e) => patchGeneral({ sex: e.target.value as StudentSex })}
                  className={fieldClass}
                >
                  <option value="">Não informado</option>
                  {SEX_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Altura (cm)</span>
                <input
                  type="number"
                  min={0}
                  value={general.heightCm}
                  onChange={(e) => patchGeneral({ heightCm: e.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Peso (kg)</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={general.weightKg}
                  onChange={(e) => patchGeneral({ weightKg: e.target.value })}
                  className={fieldClass}
                />
              </label>
            </div>

            <details className={subSectionClass}>
              <summary className="cursor-pointer text-xs font-semibold text-g4-muted">
                Composição corporal (opcional)
              </summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className={labelClass}>% de gordura</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={general.bodyFatPct}
                    onChange={(e) => patchGeneral({ bodyFatPct: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Massa muscular (kg)</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={general.muscleMassKg}
                    onChange={(e) => patchGeneral({ muscleMassKg: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Cintura (cm)</span>
                  <input
                    type="number"
                    min={0}
                    value={general.waistCm}
                    onChange={(e) => patchGeneral({ waistCm: e.target.value })}
                    className={fieldClass}
                  />
                </label>
              </div>
            </details>

            <details className={subSectionClass}>
              <summary className="cursor-pointer text-xs font-semibold text-g4-muted">
                Histórico e restrições
              </summary>
              <div className="mt-3 grid gap-4">
                <label className="block">
                  <span className={labelClass}>Histórico de variação de peso</span>
                  <textarea
                    value={general.weightHistoryNotes}
                    onChange={(e) => patchGeneral({ weightHistoryNotes: e.target.value })}
                    rows={2}
                    className={fieldClass}
                    placeholder="Ex.: perdeu 5kg nos últimos 3 meses..."
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Restrições médicas / lesões</span>
                  <textarea
                    value={general.medicalNotes}
                    onChange={(e) => patchGeneral({ medicalNotes: e.target.value })}
                    rows={2}
                    className={fieldClass}
                    placeholder="Ex.: tendinite no joelho direito..."
                  />
                </label>
              </div>
            </details>
          </details>

          {/* Modalidades */}
          <details open className={sectionClass}>
            <summary className={summaryClass}>Modalidades</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Modalidade principal</span>
                <select
                  value={primaryDiscipline}
                  onChange={(e) => handlePrimaryChange(e.target.value)}
                  className={fieldClass}
                >
                  {DISCIPLINES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <div className="block">
                <span className={labelClass}>Modalidades adicionais</span>
                <div className="mt-1 flex flex-wrap gap-4 rounded-xl border border-g4-border bg-white p-2.5">
                  {DISCIPLINES.filter((d) => d !== primaryDiscipline).map((d) => (
                    <label key={d} className="flex items-center gap-4 text-sm text-g4-ink">
                      <input
                        type="checkbox"
                        checked={secondaryDisciplines.includes(d)}
                        onChange={() => toggleSecondary(d)}
                      />
                      {d}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </details>

          {/* Ciclismo */}
          {isCycling && (
            <details open className={sectionClass}>
              <summary className={summaryClass}>Ciclismo</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>
                    FTP (watts){wattsPerKg && <span className="text-lime-deep"> · {wattsPerKg} W/kg</span>}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={cycling.ftpWatts}
                    onChange={(e) => patchCycling({ ftpWatts: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <div />
                <label className="block">
                  <span className={labelClass}>FC máxima</span>
                  <input
                    type="number"
                    min={0}
                    value={cycling.hrMax}
                    onChange={(e) => patchCycling({ hrMax: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>FC de repouso</span>
                  <input
                    type="number"
                    min={0}
                    value={cycling.hrRest}
                    onChange={(e) => patchCycling({ hrRest: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>FC de limiar</span>
                  <input
                    type="number"
                    min={0}
                    value={cycling.hrThreshold}
                    onChange={(e) => patchCycling({ hrThreshold: e.target.value })}
                    className={fieldClass}
                  />
                </label>
              </div>

              <details className={subSectionClass}>
                <summary className="cursor-pointer text-xs font-semibold text-g4-muted">
                  Métricas avançadas (opcional)
                </summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className={labelClass}>Cadência preferida (rpm)</span>
                    <input
                      type="number"
                      min={0}
                      value={cycling.preferredCadence}
                      onChange={(e) => patchCycling({ preferredCadence: e.target.value })}
                      className={fieldClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Pico curto (W)</span>
                    <input
                      type="number"
                      min={0}
                      value={cycling.peakPowerShort}
                      onChange={(e) => patchCycling({ peakPowerShort: e.target.value })}
                      className={fieldClass}
                      placeholder="ex.: sprint 5-15s"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Pico longo (W)</span>
                    <input
                      type="number"
                      min={0}
                      value={cycling.peakPowerLong}
                      onChange={(e) => patchCycling({ peakPowerLong: e.target.value })}
                      className={fieldClass}
                      placeholder="ex.: ~20min"
                    />
                  </label>
                  <label className="block sm:col-span-3">
                    <span className={labelClass}>Histórico de MTB (altimetria, TSS, IF...)</span>
                    <textarea
                      value={cycling.mtbNotes}
                      onChange={(e) => patchCycling({ mtbNotes: e.target.value })}
                      rows={2}
                      className={fieldClass}
                    />
                  </label>
                </div>
              </details>
            </details>
          )}

          {/* Corrida */}
          {isRunning && (
            <details open className={sectionClass}>
              <summary className={summaryClass}>Corrida</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Pace limiar (min/km)</span>
                  <input
                    value={running.thresholdPace}
                    onChange={(e) => patchRunning({ thresholdPace: e.target.value })}
                    className={fieldClass}
                    placeholder="ex.: 4:15"
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>VO2max</span>
                  <input
                    type="number"
                    min={0}
                    value={running.vo2max}
                    onChange={(e) => patchRunning({ vo2max: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>FC máxima</span>
                  <input
                    type="number"
                    min={0}
                    value={running.hrMax}
                    onChange={(e) => patchRunning({ hrMax: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>FC de limiar</span>
                  <input
                    type="number"
                    min={0}
                    value={running.hrThreshold}
                    onChange={(e) => patchRunning({ hrThreshold: e.target.value })}
                    className={fieldClass}
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className={labelClass}>Recorde 5km</span>
                  <input
                    value={running.pr5k}
                    onChange={(e) => patchRunning({ pr5k: e.target.value })}
                    className={fieldClass}
                    placeholder="ex.: 21:30"
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Recorde 10km</span>
                  <input
                    value={running.pr10k}
                    onChange={(e) => patchRunning({ pr10k: e.target.value })}
                    className={fieldClass}
                    placeholder="ex.: 45:00"
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Recorde meia maratona</span>
                  <input
                    value={running.prHalfMarathon}
                    onChange={(e) => patchRunning({ prHalfMarathon: e.target.value })}
                    className={fieldClass}
                    placeholder="ex.: 1:42:00"
                  />
                </label>
              </div>

              <details className={subSectionClass}>
                <summary className="cursor-pointer text-xs font-semibold text-g4-muted">
                  Biomecânica (opcional)
                </summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className={labelClass}>Cadência (passos/min)</span>
                    <input
                      type="number"
                      min={0}
                      value={running.cadence}
                      onChange={(e) => patchRunning({ cadence: e.target.value })}
                      className={fieldClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Passada (cm)</span>
                    <input
                      type="number"
                      min={0}
                      value={running.strideLengthCm}
                      onChange={(e) => patchRunning({ strideLengthCm: e.target.value })}
                      className={fieldClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Oscilação vertical (cm)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={running.verticalOscillationCm}
                      onChange={(e) => patchRunning({ verticalOscillationCm: e.target.value })}
                      className={fieldClass}
                    />
                  </label>
                </div>
              </details>
            </details>
          )}

          {/* Academia / Força */}
          {isStrength && (
            <details open className={sectionClass}>
              <summary className={summaryClass}>Academia / Força</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className={labelClass}>Objetivo principal</span>
                  <select
                    value={strength.goal}
                    onChange={(e) => patchStrength({ goal: e.target.value as StrengthGoal })}
                    className={fieldClass}
                  >
                    <option value="">Selecione...</option>
                    {STRENGTH_GOALS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>Agachamento — 1RM (kg)</span>
                  <input
                    type="number"
                    min={0}
                    value={strength.squat1RM}
                    onChange={(e) => patchStrength({ squat1RM: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Levantamento terra — 1RM (kg)</span>
                  <input
                    type="number"
                    min={0}
                    value={strength.deadlift1RM}
                    onChange={(e) => patchStrength({ deadlift1RM: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Supino — 1RM (kg)</span>
                  <input
                    type="number"
                    min={0}
                    value={strength.benchPress1RM}
                    onChange={(e) => patchStrength({ benchPress1RM: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Leg press — 1RM (kg)</span>
                  <input
                    type="number"
                    min={0}
                    value={strength.legPress1RM}
                    onChange={(e) => patchStrength({ legPress1RM: e.target.value })}
                    className={fieldClass}
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-4">
                <label className="block">
                  <span className={labelClass}>Foco dos treinos</span>
                  <textarea
                    value={strength.focusNotes}
                    onChange={(e) => patchStrength({ focusNotes: e.target.value })}
                    rows={2}
                    className={fieldClass}
                    placeholder="Ex.: fortalecimento de posterior de coxa..."
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Assimetrias musculares relatadas</span>
                  <textarea
                    value={strength.asymmetryNotes}
                    onChange={(e) => patchStrength({ asymmetryNotes: e.target.value })}
                    rows={2}
                    className={fieldClass}
                    placeholder="Ex.: perna direita mais forte que a esquerda..."
                  />
                </label>
              </div>
            </details>
          )}

          <Button type="submit" variant="primary" className="mt-1">
            Salvar aluno
          </Button>
        </form>
      </div>
    </div>
  );
}
