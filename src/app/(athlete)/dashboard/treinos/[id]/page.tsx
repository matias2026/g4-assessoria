import { notFound } from "next/navigation";
import { WorkoutDetail } from "@/components/workout/WorkoutDetail";
import { mockWorkoutDetails } from "@/lib/mock-data";

// TODO: substituir a busca mock por consulta real a workouts + workout_completions
// via src/lib/supabase/server, restrita ao atleta autenticado (RLS já cobre o acesso).
export default async function AthleteWorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workout = mockWorkoutDetails[id];

  if (!workout) notFound();

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <WorkoutDetail workout={workout} />
    </main>
  );
}
