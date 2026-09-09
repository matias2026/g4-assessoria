import { Logo } from "@/components/ui/Logo";
import { StudentsTable } from "@/components/coach/StudentsTable";
import { mockStudents } from "@/lib/mock-data";

// TODO: substituir os dados mock por consultas reais via src/lib/supabase/server
// (profiles com role = 'coach', workouts da semana e strava_activities recentes).
export default function CoachCockpitPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex items-center gap-3">
        <Logo className="h-9" />
        <div>
          <p className="text-sm text-g4-muted">Cockpit do treinador</p>
          <h1 className="text-2xl font-bold text-g4-ink">Alunos ({mockStudents.length})</h1>
        </div>
      </header>

      <StudentsTable students={mockStudents} />
    </main>
  );
}
