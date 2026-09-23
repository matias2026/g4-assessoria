"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCoachOrAdmin } from "./actions";

// Confirma que o aluno é da própria organização antes de ler/gravar
// avaliação fisiológica — mesmo padrão de notes-actions.ts/
// prescription-actions.ts: service role ignora RLS, então sem isso um
// treinador conseguiria mexer na avaliação de um aluno de outra
// organização só sabendo o id.
async function assertStudentInOrg(
  admin: ReturnType<typeof createAdminClient>,
  alunoId: string,
  organizationId: string
) {
  const { data } = await admin.from("alunos").select("id").eq("id", alunoId).eq("organization_id", organizationId).maybeSingle();
  if (!data) throw new Error("Aluno não encontrado.");
}

// Confirma que a avaliação em si (por id) pertence a um aluno da própria
// organização — usado por getAssessment/saveAssessment/deleteAssessment,
// que recebem só o id da avaliação, não o do aluno. Duas consultas em vez
// de um join embutido: mais simples de manter alinhado com o resto do
// arquivo (mesmo padrão de assertStudentInOrg) e evita depender do tipo
// gerado reconhecer a relação embutida.
async function assertAssessmentInOrg(
  admin: ReturnType<typeof createAdminClient>,
  assessmentId: string,
  organizationId: string
): Promise<string> {
  const { data: assessment } = await admin
    .from("avaliacoes_fisiologicas")
    .select("aluno_id")
    .eq("id", assessmentId)
    .maybeSingle();
  if (!assessment) throw new Error("Avaliação não encontrada.");

  await assertStudentInOrg(admin, assessment.aluno_id, organizationId);
  return assessment.aluno_id;
}

export type TipoTeste = "ciclismo" | "corrida" | "outro";

export interface PhysiologyAssessmentSummary {
  id: string;
  dataAvaliacao: string;
  tipoTeste: TipoTeste;
  lt1Potencia: number | null;
  lt1Fc: number | null;
  lt2Potencia: number | null;
  lt2Fc: number | null;
}

export interface PhysiologyStage {
  id: string | null;
  estagioNumero: number;
  tempoMinutos: number | null;
  potenciaWatts: number | null;
  pace: string | null;
  glicemia: number | null;
  fcBpm: number | null;
  lactatoMmol: number | null;
  pse: number | null;
}

export interface PhysiologyAssessmentDetail extends PhysiologyAssessmentSummary {
  observacoes: string;
  stages: PhysiologyStage[];
}

/**
 * Lista as avaliações fisiológicas (teste de lactato/glicemia) já
 * registradas pro aluno, mais recente primeiro — o histórico que aparece
 * na aba "Fisiologia" antes de abrir uma avaliação específica.
 */
export async function listPhysiologyAssessments(alunoId: string): Promise<PhysiologyAssessmentSummary[]> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  await assertStudentInOrg(admin, alunoId, organizationId);

  const { data, error } = await admin
    .from("avaliacoes_fisiologicas")
    .select("id, data_avaliacao, tipo_teste, lt1_potencia, lt1_fc, lt2_potencia, lt2_fc")
    .eq("aluno_id", alunoId)
    .order("data_avaliacao", { ascending: false });

  if (error) {
    console.error("[cockpit] erro do Postgres ao listar avaliações fisiológicas:", error.message);
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

/** Cria o cabeçalho de uma avaliação nova — os estágios são preenchidos depois, ao editar. */
export async function createPhysiologyAssessment(
  alunoId: string,
  input: { dataAvaliacao: string; tipoTeste: TipoTeste }
): Promise<PhysiologyAssessmentDetail> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  await assertStudentInOrg(admin, alunoId, organizationId);

  const { data, error } = await admin
    .from("avaliacoes_fisiologicas")
    .insert({ aluno_id: alunoId, data_avaliacao: input.dataAvaliacao, tipo_teste: input.tipoTeste })
    .select("id, data_avaliacao, tipo_teste, observacoes, lt1_potencia, lt1_fc, lt2_potencia, lt2_fc")
    .single();

  if (error || !data) {
    console.error("[cockpit] erro do Postgres ao criar avaliação fisiológica:", error?.message);
    throw new Error("Não foi possível criar a avaliação. Tente novamente.");
  }

  return {
    id: data.id,
    dataAvaliacao: data.data_avaliacao,
    tipoTeste: data.tipo_teste,
    observacoes: data.observacoes ?? "",
    lt1Potencia: data.lt1_potencia,
    lt1Fc: data.lt1_fc,
    lt2Potencia: data.lt2_potencia,
    lt2Fc: data.lt2_fc,
    stages: [],
  };
}

export async function getPhysiologyAssessment(assessmentId: string): Promise<PhysiologyAssessmentDetail> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  await assertAssessmentInOrg(admin, assessmentId, organizationId);

  const { data: header, error: headerError } = await admin
    .from("avaliacoes_fisiologicas")
    .select("id, data_avaliacao, tipo_teste, observacoes, lt1_potencia, lt1_fc, lt2_potencia, lt2_fc")
    .eq("id", assessmentId)
    .single();

  if (headerError || !header) {
    console.error("[cockpit] erro do Postgres ao buscar avaliação fisiológica:", headerError?.message);
    throw new Error("Não foi possível carregar a avaliação. Tente novamente.");
  }

  const { data: stageRows, error: stagesError } = await admin
    .from("estagios_teste_lactato")
    .select("id, estagio_numero, tempo_minutos, potencia_watts, pace, glicemia, fc_bpm, lactato_mmol, pse")
    .eq("avaliacao_id", assessmentId)
    .order("estagio_numero", { ascending: true });

  if (stagesError) {
    console.error("[cockpit] erro do Postgres ao buscar estágios da avaliação:", stagesError.message);
    throw new Error("Não foi possível carregar os estágios da avaliação. Tente novamente.");
  }

  return {
    id: header.id,
    dataAvaliacao: header.data_avaliacao,
    tipoTeste: header.tipo_teste,
    observacoes: header.observacoes ?? "",
    lt1Potencia: header.lt1_potencia,
    lt1Fc: header.lt1_fc,
    lt2Potencia: header.lt2_potencia,
    lt2Fc: header.lt2_fc,
    stages: (stageRows ?? []).map((row) => ({
      id: row.id,
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

export interface SavePhysiologyAssessmentInput {
  dataAvaliacao: string;
  tipoTeste: TipoTeste;
  observacoes: string;
  lt1Potencia: number | null;
  lt1Fc: number | null;
  lt2Potencia: number | null;
  lt2Fc: number | null;
  // Sempre a lista completa de estágios atual — substitui tudo que já
  // existia (mais simples que diff de linhas adicionadas/removidas, e o
  // volume por avaliação é sempre pequeno, poucos estágios).
  stages: Omit<PhysiologyStage, "id">[];
}

/**
 * Salva cabeçalho (inclui os limiares marcados manualmente pelo
 * treinador) + substitui os estágios pela lista atual da tela.
 */
export async function savePhysiologyAssessment(assessmentId: string, input: SavePhysiologyAssessmentInput): Promise<void> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  await assertAssessmentInOrg(admin, assessmentId, organizationId);

  const { error: headerError } = await admin
    .from("avaliacoes_fisiologicas")
    .update({
      data_avaliacao: input.dataAvaliacao,
      tipo_teste: input.tipoTeste,
      observacoes: input.observacoes || null,
      lt1_potencia: input.lt1Potencia,
      lt1_fc: input.lt1Fc,
      lt2_potencia: input.lt2Potencia,
      lt2_fc: input.lt2Fc,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assessmentId);

  if (headerError) {
    console.error("[cockpit] erro do Postgres ao salvar avaliação fisiológica:", headerError.message);
    throw new Error("Não foi possível salvar a avaliação. Tente novamente.");
  }

  const { error: deleteError } = await admin.from("estagios_teste_lactato").delete().eq("avaliacao_id", assessmentId);
  if (deleteError) {
    console.error("[cockpit] erro do Postgres ao limpar estágios da avaliação:", deleteError.message);
    throw new Error("Não foi possível salvar os estágios. Tente novamente.");
  }

  if (input.stages.length > 0) {
    const { error: insertError } = await admin.from("estagios_teste_lactato").insert(
      input.stages.map((stage) => ({
        avaliacao_id: assessmentId,
        estagio_numero: stage.estagioNumero,
        tempo_minutos: stage.tempoMinutos,
        potencia_watts: stage.potenciaWatts,
        pace: stage.pace,
        glicemia: stage.glicemia,
        fc_bpm: stage.fcBpm,
        lactato_mmol: stage.lactatoMmol,
        pse: stage.pse,
      }))
    );

    if (insertError) {
      console.error("[cockpit] erro do Postgres ao salvar estágios da avaliação:", insertError.message);
      throw new Error("Não foi possível salvar os estágios. Tente novamente.");
    }
  }
}

export async function deletePhysiologyAssessment(assessmentId: string): Promise<void> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  await assertAssessmentInOrg(admin, assessmentId, organizationId);

  const { error } = await admin.from("avaliacoes_fisiologicas").delete().eq("id", assessmentId);
  if (error) {
    console.error("[cockpit] erro do Postgres ao excluir avaliação fisiológica:", error.message);
    throw new Error("Não foi possível excluir a avaliação. Tente novamente.");
  }
}
