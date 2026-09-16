import { notFound } from "next/navigation";
import { AthleteWorkoutView } from "@/components/workout/AthleteWorkoutView";
import { buildPrescribedWorkout } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";

// Detalhe de um treino específico (histórico) do próprio aluno — busca
// real em `treinos`, restrita ao dono via aluno_id (RLS já cobre o
// acesso: treinos_athlete_select_own só deixa ver treino do próprio
// aluno_id, mas o filtro aqui também evita um round-trip inútil pro
// Supabase devolver vazio por outro motivo qualquer).
export default async function AthleteWorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: alunoData } = await supabase.from("alunos").select("id, nome, whatsapp").eq("user_id", user.id).single();
  // Mesma ressalva de tipos do resto do arquivo/app: o generic da tabela
  // via @supabase/ssr não propaga aqui.
  const aluno = alunoData as { id: string; nome: string; whatsapp: string | null } | null;
  if (!aluno) notFound();

  const { data: treinoData } = await supabase
    .from("treinos")
    .select(
      "data, titulo, modalidade, descricao, concluido, conteudo, rpe_esforco, sensacao, comentarios, atividade_fit, coach_feedback, ai_feedback_draft"
    )
    .eq("id", id)
    .eq("aluno_id", aluno.id)
    .eq("enviado", true)
    .single();
  const treino = treinoData as Parameters<typeof buildPrescribedWorkout>[2] & { data: string } | null;
  if (!treino) notFound();

  const [y, m, d] = treino.data.split("-");
  const scheduledDateLabel = `${d}/${m}/${y}`;
  const workout = buildPrescribedWorkout(
    { id: aluno.id, name: aluno.nome, phone: aluno.whatsapp ?? "" },
    scheduledDateLabel,
    treino
  );

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <AthleteWorkoutView workout={workout} />
    </main>
  );
}
