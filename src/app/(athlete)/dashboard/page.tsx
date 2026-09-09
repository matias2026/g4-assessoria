import { StravaConnectionStatus } from "@/components/athlete/StravaConnectionStatus";
import { WeeklyHistory } from "@/components/athlete/WeeklyHistory";
import { WorkoutOfDayCard } from "@/components/athlete/WorkoutOfDayCard";
import { mockWeeklyHistory, mockWorkoutOfDay } from "@/lib/mock-data";

// TODO: substituir os dados mock por consultas reais via src/lib/supabase/server
// (profiles, workouts do dia e strava_tokens do atleta autenticado).
export default function AthleteDashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <header>
        <p className="text-sm text-g4-muted">Olá,</p>
        <h1 className="text-2xl font-bold text-g4-ink">Atleta G4</h1>
      </header>

      <WorkoutOfDayCard workout={mockWorkoutOfDay} />
      <StravaConnectionStatus connected={false} />
      <WeeklyHistory days={mockWeeklyHistory} />
    </main>
  );
}
