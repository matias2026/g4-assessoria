import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CockpitTabs } from "@/components/coach/CockpitTabs";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { RoleNav } from "@/components/auth/RoleNav";
import { listExerciseLibrary } from "./actions";
import { listStudents, listTodayWorkouts } from "./students-actions";

// Sempre busca a roster e os treinos de hoje frescos — sem isso o Next
// poderia manter a página presa no que existia num render anterior (mesmo
// motivo documentado em src/app/admin/page.tsx para a lista de contas).
export const dynamic = "force-dynamic";

export default async function CoachCockpitPage() {
  // Alunos e biblioteca de exercícios primeiro (treinos de hoje dependem
  // da lista de alunos) — nunca deixa a página quebrar se alguma consulta
  // falhar.
  const [exerciseLibrary, students] = await Promise.all([
    listExerciseLibrary().catch(() => []),
    listStudents().catch(() => []),
  ]);
  const workouts = await listTodayWorkouts(students).catch(() => ({}));

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6">
      {/* Header minimalista: só logo + título e o botão de sair isolado.
          O switcher de área (admin) fica numa faixa própria abaixo, sem
          disputar espaço aqui. */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Logo className="h-9" />
          <h1 className="text-lg font-bold text-g4-ink sm:text-xl">Cockpit do treinador</h1>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <RoleNav currentPath="/cockpit" />

      <CockpitTabs
        initialStudents={students}
        initialWorkouts={workouts}
        initialExerciseLibrary={exerciseLibrary}
      />
    </main>
  );
}
