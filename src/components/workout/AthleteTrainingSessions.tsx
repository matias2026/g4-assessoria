import { Card, CardTitle } from "@/components/ui/Card";
import { VideoEmbed } from "@/components/workout/VideoEmbed";
import type { TrainingSession } from "@/lib/supabase/types";

interface AthleteTrainingSessionsProps {
  sessions: TrainingSession[];
}

/**
 * Visão somente-leitura, pro aluno, dos treinos/exercícios cadastrados
 * pelo treinador (hoje só Academia usa isso) — mesmo agrupamento visual do
 * `ExercisePrescriptionEditor`, sem nenhum input.
 */
export function AthleteTrainingSessions({ sessions }: AthleteTrainingSessionsProps) {
  if (sessions.length === 0) return null;

  return (
    <Card>
      <CardTitle>Treinos e exercícios</CardTitle>
      <div className="mt-3 flex flex-col gap-4">
        {sessions.map((session, sessionIndex) => (
          <div
            key={sessionIndex}
            className="rounded-2xl border border-g4-border bg-g4-surface-alt/60 p-4"
          >
            <h3 className="text-sm font-bold text-g4-ink">{session.name}</h3>
            <div className="mt-3 flex flex-col gap-4">
              {session.exercises.map((exercise, exerciseIndex) => (
                <div key={exerciseIndex} className="rounded-xl border border-g4-border bg-white p-3">
                  <p className="text-sm font-semibold text-g4-ink">{exercise.name}</p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-g4-muted">
                    {exercise.sets.map((set, setIndex) => (
                      <li key={setIndex}>
                        {set.reps} · carga {set.load} · intervalo {set.restSeconds}s
                      </li>
                    ))}
                  </ul>
                  {exercise.videoUrl && <VideoEmbed url={exercise.videoUrl} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
