import { Card, CardTitle } from "@/components/ui/Card";
import type { MockWorkoutDetail } from "@/lib/mock-data";

interface WorkoutPrescriptionProps {
  prescription: MockWorkoutDetail["prescription"];
}

const blocks: { key: keyof Pick<MockWorkoutDetail["prescription"], "warmup" | "mainSet" | "cooldown">; label: string }[] = [
  { key: "warmup", label: "Aquecimento" },
  { key: "mainSet", label: "Parte principal" },
  { key: "cooldown", label: "Desaquecimento" },
];

// Prescrição estruturada do treino (aquecimento / parte principal /
// desaquecimento) e link opcional de vídeo/preleção do treinador.
export function WorkoutPrescription({ prescription }: WorkoutPrescriptionProps) {
  return (
    <Card>
      <CardTitle>Prescrição do treino</CardTitle>

      <dl className="mt-3 space-y-4">
        {blocks.map(({ key, label }) => {
          const text = prescription[key];
          if (!text) return null;

          return (
            <div key={key}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-lime-deep">
                {label}
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-g4-ink">{text}</dd>
            </div>
          );
        })}
      </dl>

      {prescription.videoUrl && (
        <a
          href={prescription.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lime-deep hover:underline"
        >
          Ver vídeo/preleção do treino →
        </a>
      )}
    </Card>
  );
}
