import { AdminPreviewSwitcher } from "@/components/athlete/AdminPreviewSwitcher";
import { AthleteHeader } from "@/components/athlete/AthleteHeader";
import { NoWorkoutCard } from "@/components/athlete/NoWorkoutCard";
import { StravaConnectCard } from "@/components/athlete/StravaConnectCard";
import { TrainingSummaryCards } from "@/components/athlete/TrainingSummaryCards";
import { WeeklyHistory } from "@/components/athlete/WeeklyHistory";
import { AthleteWorkoutView } from "@/components/workout/AthleteWorkoutView";
import TreinoCarousel, { type Treino } from "@/components/workout/TreinoCarousel";
import { setWeekWorkoutCompletion } from "@/app/(athlete)/dashboard/profile-actions";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { formatDistance, formatDuration } from "@/lib/workout-metrics";
import {
  buildExampleWorkout,
  buildPrescribedWorkout,
  DEFAULT_COACH_NAME,
  DEFAULT_COACH_PHONE,
  DEMO_WORKOUT_ID,
  mockWorkoutDetails,
  PREVIEW_DISCIPLINES,
  type MockWorkoutDetail,
} from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PrescriptionContent, ProfileRole, WorkoutStatus } from "@/lib/supabase/types";

const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const SHORT_WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Semana real do aluno (Seg-Dom) a partir dos treinos já enviados — dia sem
// treino enviado fica "pending" (neutro), nunca inventa "concluído"/"perdido"
// pra um dia que não teve prescrição nenhuma.
function buildWeeklyHistory(weekTreinos: Treino[], reference: Date): { day: string; status: WorkoutStatus }[] {
  const { startIso } = currentWeekRangeIso(reference);
  const [y, m, d] = startIso.split("-").map(Number);
  const monday = new Date(y, m - 1, d);
  const todayIso = reference.toISOString().slice(0, 10);
  const byDate = new Map(weekTreinos.map((t) => [t.dataIso, t]));

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const iso = date.toISOString().slice(0, 10);
    const label = SHORT_WEEKDAY_LABELS[date.getDay()];
    const treino = byDate.get(iso);

    if (!treino) return { day: label, status: "pending" as WorkoutStatus };
    if (treino.concluido) return { day: label, status: "done" as WorkoutStatus };
    return { day: label, status: (iso < todayIso ? "missed" : "pending") as WorkoutStatus };
  });
}

// Segunda a domingo da semana de `reference`, em ISO (YYYY-MM-DD) — usado
// pra buscar só os treinos já enviados dessa semana no carrossel da Home.
function currentWeekRangeIso(reference: Date): { startIso: string; endIso: string } {
  const day = reference.getDay(); // 0 = domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return { startIso: toIso(monday), endIso: toIso(sunday) };
}

function formatDayLabel(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return WEEKDAY_LABELS[date.getDay()];
}

function formatShortDate(dateIso: string): string {
  const [, m, d] = dateIso.split("-");
  return `${d}/${m}`;
}

// Treinos da semana atual já enviados pro aluno (enviado = true), pro
// carrossel "Treino da semana" na Home — dias sem prescrição simplesmente
// não entram na lista, nunca um card inventado pra preencher espaço.
async function fetchWeekTreinos(alunoId: string): Promise<Treino[]> {
  const supabase = await createClient();
  const { startIso, endIso } = currentWeekRangeIso(new Date());

  const { data } = await supabase
    .from("treinos")
    .select("data, titulo, modalidade, descricao, concluido, conteudo")
    .eq("aluno_id", alunoId)
    .eq("enviado", true)
    .gte("data", startIso)
    .lte("data", endIso)
    .order("data", { ascending: true });

  const rows =
    (data as
      | {
          data: string;
          titulo: string | null;
          modalidade: string | null;
          descricao: string | null;
          concluido: boolean | null;
          conteudo: PrescriptionContent | null;
        }[]
      | null) ?? [];

  return rows.map((row, index) => ({
    id: index + 1,
    dia: formatDayLabel(row.data),
    data: formatShortDate(row.data),
    dataIso: row.data,
    modalidade: row.modalidade ?? "Ciclismo",
    titulo: row.titulo ?? "Treino do dia",
    descricao: row.descricao || "Sem descrição.",
    duracao: formatDuration(row.conteudo?.planned?.durationSeconds ?? null),
    distancia: formatDistance(row.conteudo?.planned?.distanceMeters ?? null),
    concluido: row.concluido ?? false,
  }));
}

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
  // Treinos da semana atual já enviados — só pro aluno real com ficha
  // vinculada; prévia do admin e demo legado ficam sempre em [].
  weekTreinos: Treino[];
  // FC máx/repouso do aluno (ciclismo ou corrida, o que tiver) — pra
  // mostrar a tabela de zonas de batimento calculada, igual à que sai na
  // mensagem de WhatsApp. null quando a ficha não tem isso cadastrado.
  hrRest: number | null;
  hrMax: number | null;
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
      weekTreinos: [],
      hrRest: null,
      hrMax: null,
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
      weekTreinos: [],
      hrRest: null,
      hrMax: null,
    };
  }

  const { data } = await supabase
    .from("alunos")
    .select("id, nome, whatsapp, modalidade, cycling_profile, running_profile")
    .eq("user_id", user.id)
    .single();
  const aluno = data as {
    id: string;
    nome: string;
    whatsapp: string | null;
    modalidade: string | null;
    cycling_profile: { hrMax: number | null; hrRest: number | null } | null;
    running_profile: { hrMax: number | null; hrRest: number | null } | null;
  } | null;

  if (aluno) {
    const athlete = { id: aluno.id, name: aluno.nome, phone: aluno.whatsapp ?? "" };
    const todayIso = new Date().toISOString().slice(0, 10);
    const discipline = aluno.modalidade ?? "Ciclismo";
    const hrRest = aluno.cycling_profile?.hrRest ?? aluno.running_profile?.hrRest ?? null;
    const hrMax = aluno.cycling_profile?.hrMax ?? aluno.running_profile?.hrMax ?? null;

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
    const weekTreinos = await fetchWeekTreinos(aluno.id);

    // Treino de verdade prescrito pelo treinador pra hoje (sendPrescription,
    // em cockpit/prescription-actions.ts) — `enviado = true` é o que
    // separa isso de um rascunho que o treinador ainda está montando (esse
    // nunca aparece aqui, só depois de "Enviar treino").
    const { data: treinoData } = await supabase
      .from("treinos")
      .select(
        "titulo, modalidade, descricao, concluido, conteudo, rpe_esforco, sensacao, comentarios, atividade_fit, coach_feedback, ai_feedback_draft"
      )
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
        weekTreinos,
        hrRest,
        hrMax,
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
      weekTreinos,
      hrRest,
      hrMax,
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
      weekTreinos: [],
      hrRest: null,
      hrMax: null,
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
    weekTreinos: [],
    hrRest: null,
    hrMax: null,
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
  const { workout, isAdmin, athleteName, coachName, coachPhone, discipline, stravaConnected, weekTreinos, hrRest, hrMax } =
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
        <AthleteWorkoutView
          workout={workout}
          isPreview={isAdmin}
          stravaConnected={stravaConnected}
          hrRest={hrRest}
          hrMax={hrMax}
        />
      ) : (
        <>
          <NoWorkoutCard talkToCoachLink={talkToCoachLink} coachName={coachName} />
          <StravaConnectCard connected={stravaConnected} />
        </>
      )}
      {weekTreinos.length > 0 && (
        <TreinoCarousel treinos={weekTreinos} onToggleComplete={setWeekWorkoutCompletion} />
      )}
      <TrainingSummaryCards isPreview={isAdmin} />
      <WeeklyHistory days={buildWeeklyHistory(weekTreinos, new Date())} />
    </main>
  );
}
