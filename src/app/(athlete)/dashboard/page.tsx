import { AdminPreviewSwitcher } from "@/components/athlete/AdminPreviewSwitcher";
import { AthleteHeader } from "@/components/athlete/AthleteHeader";
import { NoWorkoutCard } from "@/components/athlete/NoWorkoutCard";
import { WeeklyHistory } from "@/components/athlete/WeeklyHistory";
import { AthleteWorkoutView } from "@/components/workout/AthleteWorkoutView";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import {
  buildExampleWorkout,
  buildPrescribedWorkout,
  DEFAULT_COACH_NAME,
  DEFAULT_COACH_PHONE,
  DEMO_WORKOUT_ID,
  mockWeeklyHistory,
  mockWorkoutDetails,
  PREVIEW_DISCIPLINES,
  type MockWorkoutDetail,
} from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfileRole } from "@/lib/supabase/types";

function formatTodayLabel(): string {
  const today = new Date();
  const d = String(today.getDate()).padStart(2, "0");
  const m = String(today.getMonth() + 1).padStart(2, "0");
  return `Hoje · ${d}/${m}`;
}

interface ResolvedWorkout {
  // null = aluno real, mas o treinador ainda não enviou treino pra hoje —
  // nunca preenchido com o exemplo genérico, senão o aluno acha que aquilo
  // é a prescrição de verdade (era o bug: exemplo idêntico ao real).
  workout: MockWorkoutDetail | null;
  isAdmin: boolean;
  athleteName: string;
  coachName: string;
  coachPhone: string;
  discipline: string;
  // Só true pro aluno real que já autorizou /api/strava/connect — a prévia
  // do admin e o demo legado nunca têm strava_tokens de verdade.
  stravaConnected: boolean;
}

// Resolve o treino de hoje pelo usuário logado de verdade — se ele tiver
// uma linha em `alunos` (cadastrado pelo Cockpit já conectado), busca o
// treino que o treinador de fato enviou pra hoje. Admin (sem linha em
// `alunos`) ganha um seletor pra pré-visualizar as 3 modalidades sob
// demanda, com um exemplo — só pra ele, nunca pro aluno real. Contas
// antigas sem linha vinculada e sem ser admin caem no demo fixo de sempre,
// sem regressão.
async function resolveWorkout(previewDiscipline?: string): Promise<ResolvedWorkout> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const workout = mockWorkoutDetails[DEMO_WORKOUT_ID];
    return {
      workout,
      isAdmin: false,
      athleteName: workout.athleteName,
      coachName: workout.coachName,
      coachPhone: workout.coachPhone,
      discipline: workout.discipline,
      stravaConnected: false,
    };
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
    return {
      workout,
      isAdmin,
      athleteName: workout.athleteName,
      coachName: workout.coachName,
      coachPhone: workout.coachPhone,
      discipline: workout.discipline,
      stravaConnected: false,
    };
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
    const discipline = aluno.modalidade ?? "Ciclismo";

    // strava_tokens é sensível (guarda access/refresh token), então lê com a
    // service role em vez do client de sessão — mesmo padrão do lado do
    // treinador em cockpit/students-actions.ts.
    const admin = createAdminClient();
    const { data: tokenRow } = await admin
      .from("strava_tokens")
      .select("profile_id")
      .eq("profile_id", user.id)
      .maybeSingle();
    const stravaConnected = tokenRow !== null;

    // Treino de verdade prescrito pelo treinador pra hoje (sendPrescription,
    // em cockpit/prescription-actions.ts) — `enviado = true` é o que
    // separa isso de um rascunho que o treinador ainda está montando (esse
    // nunca aparece aqui, só depois de "Enviar treino").
    const { data: treinoData } = await supabase
      .from("treinos")
      .select("titulo, modalidade, descricao, concluido, conteudo, rpe_esforco, sensacao, comentarios, atividade_fit")
      .eq("aluno_id", aluno.id)
      .eq("data", todayIso)
      .eq("enviado", true)
      .single();

    // Mesma ressalva de tipos do resto do arquivo: o generic da tabela via
    // @supabase/ssr não propaga aqui.
    const treino = treinoData as Parameters<typeof buildPrescribedWorkout>[2] | null;

    if (treino) {
      // A própria tela do aluno nunca desenha os gráficos de potência/FC/
      // cadência (isso é só na aba "Analisar treino" do treinador) — sem
      // tirar as amostras aqui, um treino longo (ex.: 5h47 de pedal = ~20 mil
      // pontos, um por segundo) manda esse payload inteiro sem uso nenhum
      // pro componente cliente, o que já foi visto travando o carregamento
      // da página logo depois de enviar um .FIT grande.
      const treinoParaAluno = treino.atividade_fit
        ? { ...treino, atividade_fit: { ...treino.atividade_fit, samples: [] } }
        : treino;
      const workout = buildPrescribedWorkout(athlete, formatTodayLabel(), treinoParaAluno);
      return {
        workout,
        isAdmin,
        athleteName: workout.athleteName,
        coachName: workout.coachName,
        coachPhone: workout.coachPhone,
        discipline: workout.discipline,
        stravaConnected,
      };
    }

    // Nada enviado ainda pra hoje — aluno real nunca vê um treino de
    // exemplo aqui (só a mensagem de "nenhum treino").
    return {
      workout: null,
      isAdmin,
      athleteName: aluno.nome,
      coachName: DEFAULT_COACH_NAME,
      coachPhone: DEFAULT_COACH_PHONE,
      discipline,
      stravaConnected,
    };
  }

  if (isAdmin) {
    const workout = buildExampleWorkout(
      { id: "preview", name: "Prévia (admin)", phone: "" },
      "Ciclismo",
      formatTodayLabel()
    );
    return {
      workout,
      isAdmin,
      athleteName: workout.athleteName,
      coachName: workout.coachName,
      coachPhone: workout.coachPhone,
      discipline: workout.discipline,
      stravaConnected: false,
    };
  }

  const workout = mockWorkoutDetails[DEMO_WORKOUT_ID];
  return {
    workout,
    isAdmin: false,
    athleteName: workout.athleteName,
    coachName: workout.coachName,
    coachPhone: workout.coachPhone,
    stravaConnected: false,
    discipline: workout.discipline,
  };
}

// TODO: substituir o restante dos dados mock (histórico semanal) por
// consultas reais — treino do dia e status do Strava já resolvem pelo
// aluno real.
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
  const { workout, isAdmin, athleteName, coachName, coachPhone, discipline, stravaConnected } =
    await resolveWorkout(preview);
  const talkToCoachLink = buildWhatsAppLink(coachPhone, `Oi ${coachName}!`);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <AthleteHeader
        athleteName={athleteName}
        talkToCoachLink={talkToCoachLink}
        currentPath="/dashboard"
        previewDiscipline={isAdmin ? discipline : undefined}
      />

      {isAdmin && <AdminPreviewSwitcher basePath="/dashboard" activeDiscipline={discipline} />}

      {workout ? (
        <AthleteWorkoutView workout={workout} isPreview={isAdmin} stravaConnected={stravaConnected} />
      ) : (
        <NoWorkoutCard talkToCoachLink={talkToCoachLink} coachName={coachName} />
      )}
      <WeeklyHistory days={mockWeeklyHistory} />
    </main>
  );
}
