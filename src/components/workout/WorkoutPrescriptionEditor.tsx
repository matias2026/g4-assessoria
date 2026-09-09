import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
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

interface WorkoutPrescriptionEditorProps {
  description: string;
  prescription: MockWorkoutDetail["prescription"];
  planned: PlannedMetrics;
  onDescriptionChange: (value: string) => void;
  onPrescriptionChange: (patch: Partial<MockWorkoutDetail["prescription"]>) => void;
  onPlannedChange: (patch: Partial<PlannedMetrics>) => void;
  onSave: () => void;
  saved: boolean;
}

const fieldClass =
  "mt-1 w-full rounded-xl border border-g4-border bg-white p-2.5 text-sm text-g4-ink focus-ring";
const labelClass = "text-xs font-medium text-g4-muted";

// Converte um número (ou string vazia) do input para o tipo do estado —
// campos numéricos ficam null quando vazios, em vez de NaN.
function parseNumberInput(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Painel de prescrição e análise do treinador: descrição, blocos
 * estruturados (aquecimento/parte principal/desaquecimento), vídeo/preleção
 * e as métricas planejadas (Duração, Distância, TSS, IF, FC) que alimentam
 * a comparação com o Concluído logo abaixo. TODO: persistir em
 * workouts via Supabase quando o projeto estiver conectado (hoje só
 * atualiza o estado da tela).
 */
export function WorkoutPrescriptionEditor({
  description,
  prescription,
  planned,
  onDescriptionChange,
  onPrescriptionChange,
  onPlannedChange,
  onSave,
  saved,
}: WorkoutPrescriptionEditorProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Prescrição do treino</CardTitle>
        <Button variant="primary" className="px-4" onClick={onSave}>
          {saved ? "Salvo ✓" : "Salvar prescrição"}
        </Button>
      </div>

      <label className="mt-4 block">
        <span className={labelClass}>Descrição</span>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={2}
          className={fieldClass}
          placeholder="Resumo curto do objetivo do treino"
        />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
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

      <div className="mt-4 border-t border-g4-border pt-4">
        <p className={labelClass}>Métricas planejadas</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className={labelClass}>Duração (min)</span>
            <input
              type="number"
              min={0}
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
              value={planned.hrMax ?? ""}
              onChange={(e) => onPlannedChange({ hrMax: parseNumberInput(e.target.value) })}
              className={fieldClass}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-g4-muted">
          Ritmo/velocidade média é calculado automaticamente a partir da duração e da distância.
        </p>
      </div>
    </Card>
  );
}
