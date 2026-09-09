import { LinkButton } from "@/components/ui/LinkButton";
import { Logo } from "@/components/ui/Logo";
import { StravaConnectionStatus } from "@/components/athlete/StravaConnectionStatus";
import { WeeklyHistory } from "@/components/athlete/WeeklyHistory";
import { WorkoutOfDayCard } from "@/components/athlete/WorkoutOfDayCard";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { DEMO_WORKOUT_ID, mockWeeklyHistory, mockWorkoutDetails, mockWorkoutOfDay } from "@/lib/mock-data";

// TODO: substituir os dados mock por consultas reais via src/lib/supabase/server
// (profiles, workouts do dia e strava_tokens do atleta autenticado).
export default function AthleteDashboardPage() {
  const coach = mockWorkoutDetails[DEMO_WORKOUT_ID];
  const talkToCoachLink = buildWhatsAppLink(coach.coachPhone, `Oi ${coach.coachName}!`);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Logo className="h-9" />
          <div>
            <p className="text-sm text-g4-muted">Olá,</p>
            <h1 className="text-2xl font-bold text-g4-ink">Atleta G4</h1>
          </div>
        </div>
        <LinkButton href={talkToCoachLink} target="_blank" rel="noreferrer" variant="ghost" className="px-3 text-xs">
          💬 Falar com o treinador
        </LinkButton>
      </header>

      <WorkoutOfDayCard workout={mockWorkoutOfDay} />
      <StravaConnectionStatus connected={false} />
      <WeeklyHistory days={mockWeeklyHistory} />
    </main>
  );
}
