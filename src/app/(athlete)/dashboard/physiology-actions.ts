"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { TipoTeste } from "@/app/(coach)/cockpit/physiology-actions";

// Mesmo padrão de dashboard/profile-actions.ts: sessão só pra identidade,
// admin client pra ler de verdade (o generic do @supabase/ssr não
// propaga). Filtra explicitamente por aluno_id + published — RLS
// (migração 0027) já trava isso, mas o client de service role ignora RLS,
// então a checagem aqui é o que realmente impede o aluno ver avaliação de
// outro aluno ou um rascunho ainda não publicado.
async function requireOwnAlunoId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data } = await admin.from("alunos").select("id").eq("user_id", user.id).single();
  if (!data) throw new Error("Nenhuma ficha de aluno encontrada pra esse login.");
  return data.id;
}

export interface OwnPhysiologyAssessmentSummary {
  id: string;
  dataAvaliacao: string;
  tipoTeste: TipoTeste;
  lt1Potencia: number | null;
  lt1Fc: number | null;
  lt2Potencia: number | null;
  lt2Fc: number | null;
}

export interface OwnPhysiologyStage {
  estagioNumero: number;
  tempoMinutos: number | null;
  potenciaWatts: number | null;
  pace: string | null;
  glicemia: number | null;
  fcBpm: number | null;
  lactatoMmol: number | null;
  pse: number | null;
}

export interface OwnPhysiologyAssessmentDetail extends OwnPhysiologyAssessmentSummary {
  // Só o parecer final (revisado pelo treinador), nunca o rascunho de IA
  // nem as observações internas do treinador — mesmo espírito de
  // treinos.coach_feedback vs. ai_feedback_draft.
  parecer: string | null;
  stages: OwnPhysiologyStage[];
}

/** Avaliações fisiológicas publicadas do próprio aluno logado, mais recente primeiro. */
export async function listOwnPhysiologyAssessments(): Promise<OwnPhysiologyAssessmentSummary[]> {
  const alunoId = await requireOwnAlunoId();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("avaliacoes_fisiologicas")
    .select("id, data_avaliacao, tipo_teste, lt1_potencia, lt1_fc, lt2_potencia, lt2_fc")
    .eq("aluno_id", alunoId)
    .eq("published", true)
    .order("data_avaliacao", { ascending: false });

  if (error) {
    console.error("[dashboard] erro do Postgres ao listar avaliações fisiológicas do aluno:", error.message);
    throw new Error("Não foi possível carregar as avaliações. Tente novamente.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    dataAvaliacao: row.data_avaliacao,
    tipoTeste: row.tipo_teste,
    lt1Potencia: row.lt1_potencia,
    lt1Fc: row.lt1_fc,
    lt2Potencia: row.lt2_potencia,
    lt2Fc: row.lt2_fc,
  }));
}

export async function getOwnPhysiologyAssessment(assessmentId: string): Promise<OwnPhysiologyAssessmentDetail> {
  const alunoId = await requireOwnAlunoId();
  const admin = createAdminClient();

  const { data: header, error: headerError } = await admin
    .from("avaliacoes_fisiologicas")
    .select("id, data_avaliacao, tipo_teste, lt1_potencia, lt1_fc, lt2_potencia, lt2_fc, ai_report_final")
    .eq("id", assessmentId)
    .eq("aluno_id", alunoId)
    .eq("published", true)
    .single();

  if (headerError || !header) {
    throw new Error("Avaliação não encontrada.");
  }

  const { data: stageRows } = await admin
    .from("estagios_teste_lactato")
    .select("estagio_numero, tempo_minutos, potencia_watts, pace, glicemia, fc_bpm, lactato_mmol, pse")
    .eq("avaliacao_id", assessmentId)
    .order("estagio_numero", { ascending: true });

  return {
    id: header.id,
    dataAvaliacao: header.data_avaliacao,
    tipoTeste: header.tipo_teste,
    lt1Potencia: header.lt1_potencia,
    lt1Fc: header.lt1_fc,
    lt2Potencia: header.lt2_potencia,
    lt2Fc: header.lt2_fc,
    parecer: header.ai_report_final,
    stages: (stageRows ?? []).map((row) => ({
      estagioNumero: row.estagio_numero,
      tempoMinutos: row.tempo_minutos,
      potenciaWatts: row.potencia_watts,
      pace: row.pace,
      glicemia: row.glicemia,
      fcBpm: row.fc_bpm,
      lactatoMmol: row.lactato_mmol,
      pse: row.pse,
    })),
  };
}
