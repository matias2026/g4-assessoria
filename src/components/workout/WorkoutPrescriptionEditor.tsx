import type { FocusEvent } from "react";
import { buildHrZoneTableLines } from "@/lib/hr-zones";
import type { MockWorkoutDetail } from "@/lib/mock-data";

export interface PlannedMetrics {
  durationSeconds: number | null;
  distanceMeters: number | null;
  tss: number | null;
  ifScore: number | null;
  hrMin: number | null;
  hrAvg: number | null;
  hrMax: number | null;
}

const fieldClass =
  "mt-1 w-full rounded-xl border border-g4-border bg-g4-surface p-2.5 text-sm text-g4-ink focus-ring";
const labelClass = "text-xs font-medium text-g4-muted";

// Converte um número (ou string vazia) do input para o tipo do estado —
// campos numéricos ficam null quando vazios, em vez de NaN.
function parseNumberInput(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

// Seleciona o texto inteiro ao focar um campo numérico — sem isso, editar
// um valor já preenchido gruda o próximo dígito depois do que já estava
// lá (ou depois do "0" que o campo volta a mostrar ao apagar tudo).
function selectAllOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.target.select();
}

interface WorkoutDescriptionFieldsProps {
  description: string;
  prescription: MockWorkoutDetail["prescription"];
  onDescriptionChange: (value: string) => void;
  onPrescriptionChange: (patch: Partial<MockWorkoutDetail["prescription"]>) => void;
  // FC máx/repouso do aluno selecionado — mostra a tabela de zonas já
  // calculada (a mesma que vai pro WhatsApp), pra ninguém mais precisar
  // digitar isso à mão na descrição.
  hrRest?: number | null;
  hrMax?: number | null;
}

/**
 * Descrição + tabela de zonas de FC (calculada) + blocos de texto livre
 * (aquecimento/parte principal/desaquecimento) + vídeo/preleção — um dos
 * passos do assistente de prescrição em PrescribeTab.tsx. Sem `<Card>`
 * próprio: quem chama já está dentro do card único do passo atual.
 */
export function WorkoutDescriptionFields({
  description,
  prescription,
  onDescriptionChange,
  onPrescriptionChange,
  hrRest = null,
  hrMax = null,
}: WorkoutDescriptionFieldsProps) {
  const zoneLines = buildHrZoneTableLines(hrRest, hrMax);

  return (
    <>
      <label className="block">
        <span className={labelClass}>Descrição</span>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={2}
          className={fieldClass}
          placeholder="Resumo curto do objetivo do treino"
        />
      </label>

      <div className="mt-3 rounded-xl border border-g4-border bg-g4-surface-alt p-3">
        <p className={labelClass}>Zona de batimentos deste aluno</p>
        {zoneLines ? (
          <ul className="mt-1 flex flex-col flex-wrap gap-4 text-sm text-g4-ink sm:flex-row">
            {zoneLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-g4-muted">
            Cadastre a FC máxima e de repouso na ficha do aluno pra essa tabela sair calculada — sem
            precisar digitar zona por zona aqui ou na mensagem de WhatsApp.
          </p>
        )}
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className={labelClass}>Aquecimento</span>
          <textarea
            value={prescription.warmup}
            onChange={(e) => onPrescriptionChange({ warmup: e.target.value })}
            rows={3}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Parte principal</span>
          <textarea
            value={prescription.mainSet}
            onChange={(e) => onPrescriptionChange({ mainSet: e.target.value })}
            rows={3}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Desaquecimento</span>
          <textarea
            value={prescription.cooldown}
            onChange={(e) => onPrescriptionChange({ cooldown: e.target.value })}
            rows={3}
            className={fieldClass}
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className={labelClass}>Link de vídeo/preleção</span>
        <input
          type="url"
          value={prescription.videoUrl ?? ""}
          onChange={(e) => onPrescriptionChange({ videoUrl: e.target.value || null })}
          placeholder="https://..."
          className={fieldClass}
        />
      </label>
    </>
  );
}

interface PlannedMetricsFieldsProps {
  planned: PlannedMetrics;
  onPlannedChange: (patch: Partial<PlannedMetrics>) => void;
}

/**
 * Métricas planejadas (Duração/Distância/TSS/IF/FC) — outro passo do
 * assistente de prescrição. Alimentam a comparação com o Concluído na
 * aba Analisar. Sem `<Card>` próprio, mesma razão do componente acima.
 */
export function PlannedMetricsFields({ planned, onPlannedChange }: PlannedMetricsFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="block">
          <span className={labelClass}>Duração (min)</span>
          <input
            type="number"
            min={0}
            onFocus={selectAllOnFocus}
            value={planned.durationSeconds == null ? "" : Math.round(planned.durationSeconds / 60)}
            onChange={(e) => {
              const minutes = parseNumberInput(e.target.value);
              onPlannedChange({ durationSeconds: minutes == null ? null : minutes * 60 });
            }}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Distância (km)</span>
          <input
            type="number"
            min={0}
            onFocus={selectAllOnFocus}
            step={0.1}
            value={planned.distanceMeters == null ? "" : planned.distanceMeters / 1000}
            onChange={(e) => {
              const km = parseNumberInput(e.target.value);
              onPlannedChange({ distanceMeters: km == null ? null : km * 1000 });
            }}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>TSS</span>
          <input
            type="number"
            min={0}
            onFocus={selectAllOnFocus}
            value={planned.tss ?? ""}
            onChange={(e) => onPlannedChange({ tss: parseNumberInput(e.target.value) })}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>IF</span>
          <input
            type="number"
            min={0}
            onFocus={selectAllOnFocus}
            step={0.01}
            value={planned.ifScore ?? ""}
            onChange={(e) => onPlannedChange({ ifScore: parseNumberInput(e.target.value) })}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>FC mínima</span>
          <input
            type="number"
            min={0}
            onFocus={selectAllOnFocus}
            value={planned.hrMin ?? ""}
            onChange={(e) => onPlannedChange({ hrMin: parseNumberInput(e.target.value) })}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>FC média</span>
          <input
            type="number"
            min={0}
            onFocus={selectAllOnFocus}
            value={planned.hrAvg ?? ""}
            onChange={(e) => onPlannedChange({ hrAvg: parseNumberInput(e.target.value) })}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>FC máxima</span>
          <input
            type="number"
            min={0}
            onFocus={selectAllOnFocus}
            value={planned.hrMax ?? ""}
            onChange={(e) => onPlannedChange({ hrMax: parseNumberInput(e.target.value) })}
            className={fieldClass}
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-g4-muted">
        Ritmo/velocidade média é calculado automaticamente a partir da duração e da distância.
      </p>
    </>
  );
}
