import { Logo } from "@/components/ui/Logo";
import { CockpitTabs } from "@/components/coach/CockpitTabs";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { RoleNav } from "@/components/auth/RoleNav";
import { mockStudents, mockWorkoutDetails } from "@/lib/mock-data";

// TODO: substituir os dados mock por consultas reais via src/lib/supabase/server
// (profiles com role = 'coach', workouts da semana e strava_activities recentes).
export default function CoachCockpitPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8">
      {/* Header minimalista: só logo + título e o botão de sair isolado.
          O switcher de área (admin) fica numa faixa própria abaixo, sem
          disputar espaço aqui. */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo className="h-9" />
          <h1 className="text-lg font-bold text-g4-ink sm:text-xl">Cockpit do treinador</h1>
        </div>
        <LogoutButton />
      </header>

      <RoleNav currentPath="/cockpit" />

      <CockpitTabs initialStudents={mockStudents} initialWorkouts={mockWorkoutDetails} />
    </main>
  );
}
