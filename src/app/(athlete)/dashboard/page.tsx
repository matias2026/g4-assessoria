import { LinkButton } from "@/components/ui/LinkButton";
import { Logo } from "@/components/ui/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { RoleNav } from "@/components/auth/RoleNav";
import { WeeklyHistory } from "@/components/athlete/WeeklyHistory";
import { AthleteWorkoutView } from "@/components/workout/AthleteWorkoutView";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { DEMO_WORKOUT_ID, mockWeeklyHistory, mockWorkoutDetails } from "@/lib/mock-data";

// TODO: substituir os dados mock por consultas reais via src/lib/supabase/server
// (profiles, workouts do dia e strava_tokens do atleta autenticado).
export default function AthleteDashboardPage() {
  const workout = mockWorkoutDetails[DEMO_WORKOUT_ID];
  const talkToCoachLink = buildWhatsAppLink(workout.coachPhone, `Oi ${workout.coachName}!`);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-3 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Logo className="h-9" />
          <div>
            <p className="text-sm text-g4-muted">Olá,</p>
            <h1 className="text-2xl font-bold text-g4-ink">{workout.athleteName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <LinkButton href={talkToCoachLink} target="_blank" rel="noreferrer" variant="ghost" className="px-3 text-xs">
            💬 Falar com o treinador
          </LinkButton>
          <LogoutButton />
        </div>
      </header>

      <RoleNav />

      <AthleteWorkoutView workout={workout} />
      <WeeklyHistory days={mockWeeklyHistory} />
    </main>
  );
}
