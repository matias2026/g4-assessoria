import Link from "next/link";
import { LinkButton } from "@/components/ui/LinkButton";
import { Logo } from "@/components/ui/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { RoleNav } from "@/components/auth/RoleNav";
import { WeeklyHistory } from "@/components/athlete/WeeklyHistory";
import { AthleteWorkoutView } from "@/components/workout/AthleteWorkoutView";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import {
  buildExampleWorkout,
  DEMO_WORKOUT_ID,
  mockWeeklyHistory,
  mockWorkoutDetails,
  type MockWorkoutDetail,
} from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ProfileRole } from "@/lib/supabase/types";

const PREVIEW_DISCIPLINES = ["Ciclismo", "Corrida", "Academia"];

function formatTodayLabel(): string {
  const today = new Date();
  const d = String(today.getDate()).padStart(2, "0");
  const m = String(today.getMonth() + 1).padStart(2, "0");
  return `Hoje · ${d}/${m}`;
}

interface ResolvedWorkout {
  workout: MockWorkoutDetail;
  isAdmin: boolean;
}

// Resolve o treino de hoje pelo usuário logado de verdade — se ele tiver
// uma linha em `alunos` (cadastrado pelo Cockpit já conectado), monta um
// treino de exemplo da modalidade real dele. Admin (sem linha em `alunos`)
// ganha um seletor pra pré-visualizar as 3 modalidades sob demanda, sem
// precisar de uma conta real por modalidade. Contas antigas sem linha
// vinculada e sem ser admin caem no demo fixo de sempre, sem regressão.
async function resolveWorkout(previewDiscipline?: string): Promise<ResolvedWorkout> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { workout: mockWorkoutDetails[DEMO_WORKOUT_ID], isAdmin: false };
  }

  const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  // Mesma ressalva de tipos do resto do código (RoleNav/proxy.ts): o
  // generic da tabela via @supabase/ssr não propaga aqui.
  const profile = profileData as { role: ProfileRole } | null;
  const isAdmin = profile?.role === "admin";

  if (isAdmin && previewDiscipline && PREVIEW_DISCIPLINES.includes(previewDiscipline)) {
    const workout = buildExampleWorkout(
      { id: "preview", name: "Prévia (admin)", phone: "" },
      previewDiscipline,
      formatTodayLabel()
    );
    return { workout, isAdmin };
  }

  const { data } = await supabase
    .from("alunos")
    .select("id, nome, whatsapp, modalidade")
    .eq("user_id", user.id)
    .single();
  const aluno = data as { id: string; nome: string; whatsapp: string | null; modalidade: string | null } | null;

  if (aluno) {
    const workout = buildExampleWorkout(
      { id: aluno.id, name: aluno.nome, phone: aluno.whatsapp ?? "" },
      aluno.modalidade ?? "Ciclismo",
      formatTodayLabel()
    );
    return { workout, isAdmin };
  }

  if (isAdmin) {
    const workout = buildExampleWorkout(
      { id: "preview", name: "Prévia (admin)", phone: "" },
      "Ciclismo",
      formatTodayLabel()
    );
    return { workout, isAdmin };
  }

  return { workout: mockWorkoutDetails[DEMO_WORKOUT_ID], isAdmin: false };
}

// TODO: substituir o restante dos dados mock (histórico semanal) por
// consultas reais via src/lib/supabase/server quando treinos/strava_tokens
// estiverem conectados — o treino do dia já resolve pelo aluno real.
export default async function AthleteDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const { preview } = await searchParams;
  const { workout, isAdmin } = await resolveWorkout(preview);
  const talkToCoachLink = buildWhatsAppLink(workout.coachPhone, `Oi ${workout.coachName}!`);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Logo className="h-9 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-g4-muted">Olá,</p>
            <h1 className="truncate text-2xl font-bold text-g4-ink">{workout.athleteName}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <LinkButton href={talkToCoachLink} target="_blank" rel="noreferrer" variant="ghost" className="px-3 text-xs">
            💬 Treinador
          </LinkButton>
          <LogoutButton />
        </div>
      </header>

      <RoleNav currentPath="/dashboard" />

      {isAdmin && (
        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium text-g4-muted">Prévia da área do atleta (admin)</p>
          <nav className="flex gap-4 rounded-2xl border border-g4-border bg-g4-surface p-1.5">
            {PREVIEW_DISCIPLINES.map((discipline) => (
              <Link
                key={discipline}
                href={`/dashboard?preview=${discipline}`}
                className={cn(
                  "flex-1 rounded-xl px-4 py-2 text-center text-sm font-semibold transition-colors focus-ring",
                  workout.discipline === discipline
                    ? "bg-lime text-g4-ink"
                    : "text-g4-muted hover:bg-g4-surface-alt hover:text-g4-ink"
                )}
              >
                {discipline}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <AthleteWorkoutView workout={workout} />
      <WeeklyHistory days={mockWeeklyHistory} />
    </main>
  );
}
