import { AdminPreviewSwitcher } from "@/components/athlete/AdminPreviewSwitcher";
import { AthleteHeader } from "@/components/athlete/AthleteHeader";
import { WeeklyHistory } from "@/components/athlete/WeeklyHistory";
import { AthleteWorkoutView } from "@/components/workout/AthleteWorkoutView";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import {
  buildExampleWorkout,
  buildPrescribedWorkout,
  DEMO_WORKOUT_ID,
  mockWeeklyHistory,
  mockWorkoutDetails,
  PREVIEW_DISCIPLINES,
  type MockWorkoutDetail,
} from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/supabase/types";

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
    const athlete = { id: aluno.id, name: aluno.nome, phone: aluno.whatsapp ?? "" };
    const todayIso = new Date().toISOString().slice(0, 10);

    // Treino de verdade prescrito pelo treinador pra hoje (sendPrescription,
    // em cockpit/prescription-actions.ts) tem prioridade sobre o exemplo
    // genérico da modalidade — sem isso, o painel do aluno nunca refletia
    // o que o treinador acabou de enviar. `enviado = true` é o que separa
    // isso de um rascunho que o treinador ainda está montando (esse nunca
    // aparece aqui, só depois de "Enviar treino").
    const { data: treinoData } = await supabase
      .from("treinos")
      .select("titulo, modalidade, descricao, concluido, conteudo")
      .eq("aluno_id", aluno.id)
      .eq("data", todayIso)
      .eq("enviado", true)
      .single();

    if (treinoData) {
      const workout = buildPrescribedWorkout(athlete, formatTodayLabel(), treinoData);
      return { workout, isAdmin };
    }

    const workout = buildExampleWorkout(athlete, aluno.modalidade ?? "Ciclismo", formatTodayLabel());
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
//
// Sempre busca o aluno/treino fresco — sem isso o Next poderia manter a
// página presa no que existia num render anterior (mesmo motivo
// documentado em src/app/admin/page.tsx para a lista de contas).
export const dynamic = "force-dynamic";

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
      <AthleteHeader
        athleteName={workout.athleteName}
        talkToCoachLink={talkToCoachLink}
        currentPath="/dashboard"
        previewDiscipline={isAdmin ? workout.discipline : undefined}
      />

      {isAdmin && <AdminPreviewSwitcher basePath="/dashboard" activeDiscipline={workout.discipline} />}

      <AthleteWorkoutView workout={workout} />
      <WeeklyHistory days={mockWeeklyHistory} />
    </main>
  );
}
