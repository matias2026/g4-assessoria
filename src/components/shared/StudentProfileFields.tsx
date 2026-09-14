import type { StrengthGoal, StudentSex } from "@/lib/supabase/types";
import {
  DISCIPLINES,
  SEX_OPTIONS,
  STRENGTH_GOALS,
  fieldClass,
  labelClass,
  sectionClass,
  subSectionClass,
  summaryClass,
  type CyclingFields,
  type GeneralFields,
  type RunningFields,
  type StrengthFields,
} from "@/lib/student-profile-form";

interface StudentProfileFieldsProps {
  general: GeneralFields;
  onPatchGeneral: (patch: Partial<GeneralFields>) => void;
  primaryDiscipline: string;
  secondaryDisciplines: string[];
  onChangePrimaryDiscipline: (next: string) => void;
  onToggleSecondaryDiscipline: (discipline: string) => void;
  cycling: CyclingFields;
  onPatchCycling: (patch: Partial<CyclingFields>) => void;
  running: RunningFields;
  onPatchRunning: (patch: Partial<RunningFields>) => void;
  strength: StrengthFields;
  onPatchStrength: (patch: Partial<StrengthFields>) => void;
}

/**
 * Campos corporais + por modalidade compartilhados entre o cadastro/edição
 * do treinador (AddStudentModal) e o autoatendimento do aluno
 * (AthleteProfileForm) — mesma ficha, dois lugares que a preenchem. E-mail/
 * senha (só faz sentido na criação de conta pelo treinador) e o comentário
 * do treinador (só ele edita) ficam de fora, tratados por quem usa isto.
 */
export function StudentProfileFields({
  general,
  onPatchGeneral,
  primaryDiscipline,
  secondaryDisciplines,
  onChangePrimaryDiscipline,
  onToggleSecondaryDiscipline,
  cycling,
  onPatchCycling,
  running,
  onPatchRunning,
  strength,
  onPatchStrength,
}: StudentProfileFieldsProps) {
  const practiced = [primaryDiscipline, ...secondaryDisciplines];
  const isCycling = practiced.includes("Ciclismo");
  const isRunning = practiced.includes("Corrida");
  const isStrength = practiced.includes("Academia");

  const ftpNum = Number(cycling.ftpWatts);
  const weightNum = Number(general.weightKg);
  const wattsPerKg = ftpNum > 0 && weightNum > 0 ? (ftpNum / weightNum).toFixed(2) : null;

  return (
    <>
      {/* Dados gerais */}
      <details open className={sectionClass}>
        <summary className={summaryClass}>Dados gerais</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Nome</span>
            <input
              value={general.name}
              onChange={(e) => onPatchGeneral({ name: e.target.value })}
              required
              className={fieldClass}
              placeholder="Nome completo"
            />
          </label>
          <label className="block">
            <span className={labelClass}>WhatsApp</span>
            <input
              value={general.phone}
              onChange={(e) => onPatchGeneral({ phone: e.target.value })}
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
              onChange={(e) => onPatchGeneral({ age: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Sexo</span>
            <select
              value={general.sex}
              onChange={(e) => onPatchGeneral({ sex: e.target.value as StudentSex })}
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
              onChange={(e) => onPatchGeneral({ heightCm: e.target.value })}
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
              onChange={(e) => onPatchGeneral({ weightKg: e.target.value })}
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
                onChange={(e) => onPatchGeneral({ bodyFatPct: e.target.value })}
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
                onChange={(e) => onPatchGeneral({ muscleMassKg: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Cintura (cm)</span>
              <input
                type="number"
                min={0}
                value={general.waistCm}
                onChange={(e) => onPatchGeneral({ waistCm: e.target.value })}
                className={fieldClass}
              />
            </label>
          </div>
        </details>

        <details className={subSectionClass}>
          <summary className="cursor-pointer text-xs font-semibold text-g4-muted">Histórico e restrições</summary>
          <div className="mt-3 grid gap-4">
            <label className="block">
              <span className={labelClass}>Histórico de variação de peso</span>
              <textarea
                value={general.weightHistoryNotes}
                onChange={(e) => onPatchGeneral({ weightHistoryNotes: e.target.value })}
                rows={2}
                className={fieldClass}
                placeholder="Ex.: perdeu 5kg nos últimos 3 meses..."
              />
            </label>
            <label className="block">
              <span className={labelClass}>Restrições médicas / lesões</span>
              <textarea
                value={general.medicalNotes}
                onChange={(e) => onPatchGeneral({ medicalNotes: e.target.value })}
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
              onChange={(e) => onChangePrimaryDiscipline(e.target.value)}
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
            <div className="mt-1 flex flex-wrap gap-4 rounded-xl border border-g4-border bg-g4-surface p-2.5">
              {DISCIPLINES.filter((d) => d !== primaryDiscipline).map((d) => (
                <label key={d} className="flex items-center gap-4 text-sm text-g4-ink">
                  <input
                    type="checkbox"
                    checked={secondaryDisciplines.includes(d)}
                    onChange={() => onToggleSecondaryDiscipline(d)}
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
                onChange={(e) => onPatchCycling({ ftpWatts: e.target.value })}
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
                onChange={(e) => onPatchCycling({ hrMax: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>FC de repouso</span>
              <input
                type="number"
                min={0}
                value={cycling.hrRest}
                onChange={(e) => onPatchCycling({ hrRest: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>FC de limiar</span>
              <input
                type="number"
                min={0}
                value={cycling.hrThreshold}
                onChange={(e) => onPatchCycling({ hrThreshold: e.target.value })}
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
                  onChange={(e) => onPatchCycling({ preferredCadence: e.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Pico curto (W)</span>
                <input
                  type="number"
                  min={0}
                  value={cycling.peakPowerShort}
                  onChange={(e) => onPatchCycling({ peakPowerShort: e.target.value })}
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
                  onChange={(e) => onPatchCycling({ peakPowerLong: e.target.value })}
                  className={fieldClass}
                  placeholder="ex.: ~20min"
                />
              </label>
              <label className="block sm:col-span-3">
                <span className={labelClass}>Histórico de MTB (altimetria, TSS, IF...)</span>
                <textarea
                  value={cycling.mtbNotes}
                  onChange={(e) => onPatchCycling({ mtbNotes: e.target.value })}
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
                onChange={(e) => onPatchRunning({ thresholdPace: e.target.value })}
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
                onChange={(e) => onPatchRunning({ vo2max: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>FC máxima</span>
              <input
                type="number"
                min={0}
                value={running.hrMax}
                onChange={(e) => onPatchRunning({ hrMax: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>FC de limiar</span>
              <input
                type="number"
                min={0}
                value={running.hrThreshold}
                onChange={(e) => onPatchRunning({ hrThreshold: e.target.value })}
                className={fieldClass}
              />
            </label>
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelClass}>Recorde 5km</span>
              <input
                value={running.pr5k}
                onChange={(e) => onPatchRunning({ pr5k: e.target.value })}
                className={fieldClass}
                placeholder="ex.: 21:30"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Recorde 10km</span>
              <input
                value={running.pr10k}
                onChange={(e) => onPatchRunning({ pr10k: e.target.value })}
                className={fieldClass}
                placeholder="ex.: 45:00"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Recorde meia maratona</span>
              <input
                value={running.prHalfMarathon}
                onChange={(e) => onPatchRunning({ prHalfMarathon: e.target.value })}
                className={fieldClass}
                placeholder="ex.: 1:42:00"
              />
            </label>
          </div>

          <details className={subSectionClass}>
            <summary className="cursor-pointer text-xs font-semibold text-g4-muted">Biomecânica (opcional)</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className={labelClass}>Cadência (passos/min)</span>
                <input
                  type="number"
                  min={0}
                  value={running.cadence}
                  onChange={(e) => onPatchRunning({ cadence: e.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Passada (cm)</span>
                <input
                  type="number"
                  min={0}
                  value={running.strideLengthCm}
                  onChange={(e) => onPatchRunning({ strideLengthCm: e.target.value })}
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
                  onChange={(e) => onPatchRunning({ verticalOscillationCm: e.target.value })}
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
                onChange={(e) => onPatchStrength({ goal: e.target.value as StrengthGoal })}
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
                onChange={(e) => onPatchStrength({ squat1RM: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Levantamento terra — 1RM (kg)</span>
              <input
                type="number"
                min={0}
                value={strength.deadlift1RM}
                onChange={(e) => onPatchStrength({ deadlift1RM: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Supino — 1RM (kg)</span>
              <input
                type="number"
                min={0}
                value={strength.benchPress1RM}
                onChange={(e) => onPatchStrength({ benchPress1RM: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Leg press — 1RM (kg)</span>
              <input
                type="number"
                min={0}
                value={strength.legPress1RM}
                onChange={(e) => onPatchStrength({ legPress1RM: e.target.value })}
                className={fieldClass}
              />
            </label>
          </div>

          <div className="mt-3 grid gap-4">
            <label className="block">
              <span className={labelClass}>Foco dos treinos</span>
              <textarea
                value={strength.focusNotes}
                onChange={(e) => onPatchStrength({ focusNotes: e.target.value })}
                rows={2}
                className={fieldClass}
                placeholder="Ex.: fortalecimento de posterior de coxa..."
              />
            </label>
            <label className="block">
              <span className={labelClass}>Assimetrias musculares relatadas</span>
              <textarea
                value={strength.asymmetryNotes}
                onChange={(e) => onPatchStrength({ asymmetryNotes: e.target.value })}
                rows={2}
                className={fieldClass}
                placeholder="Ex.: perna direita mais forte que a esquerda..."
              />
            </label>
          </div>
        </details>
      )}
    </>
  );
}
