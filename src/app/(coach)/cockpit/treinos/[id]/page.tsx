import { notFound } from "next/navigation";
import { WorkoutDetail } from "@/components/workout/WorkoutDetail";
import { mockWorkoutDetails } from "@/lib/mock-data";

// TODO: substituir a busca mock por consulta real a workouts + workout_completions
// via src/lib/supabase/server, restrita aos treinos do treinador autenticado.
export default async function CoachWorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workout = mockWorkoutDetails[id];

  if (!workout) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <WorkoutDetail workout={workout} showAthleteName />
    </main>
  );
}
