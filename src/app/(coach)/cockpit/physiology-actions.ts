"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { generatePhysiologyReportDraft as generateReportDraftFromGemini } from "@/lib/ai/gemini";
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
  published: boolean;
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
  hrvRmssdRest: number | null;
  hrvSdnnRest: number | null;
  hrvNotes: string;
  aiReportDraft: string | null;
  aiReportFinal: string | null;
  appliedToFichaAt: string | null;
  stages: PhysiologyStage[];
}

const SUMMARY_COLUMNS = "id, data_avaliacao, tipo_teste, lt1_potencia, lt1_fc, lt2_potencia, lt2_fc, published";
const DETAIL_COLUMNS =
  "id, data_avaliacao, tipo_teste, observacoes, lt1_potencia, lt1_fc, lt2_potencia, lt2_fc, hrv_rmssd_rest, hrv_sdnn_rest, hrv_notes, ai_report_draft, ai_report_final, applied_to_ficha_at, published";

function mapSummaryRow(row: {
  id: string;
  data_avaliacao: string;
  tipo_teste: TipoTeste;
  lt1_potencia: number | null;
  lt1_fc: number | null;
  lt2_potencia: number | null;
  lt2_fc: number | null;
  published: boolean;
}): PhysiologyAssessmentSummary {
  return {
    id: row.id,
    dataAvaliacao: row.data_avaliacao,
    tipoTeste: row.tipo_teste,
    lt1Potencia: row.lt1_potencia,
    lt1Fc: row.lt1_fc,
    lt2Potencia: row.lt2_potencia,
    lt2Fc: row.lt2_fc,
    published: row.published,
  };
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
    .select(SUMMARY_COLUMNS)
    .eq("aluno_id", alunoId)
    .order("data_avaliacao", { ascending: false });

  if (error) {
    console.error("[cockpit] erro do Postgres ao listar avaliações fisiológicas:", error.message);
    throw new Error("Não foi possível carregar as avaliações. Tente novamente.");
  }

  return (data ?? []).map(mapSummaryRow);
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
    .select(DETAIL_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[cockpit] erro do Postgres ao criar avaliação fisiológica:", error?.message);
    throw new Error("Não foi possível criar a avaliação. Tente novamente.");
  }

  return {
    ...mapSummaryRow(data),
    observacoes: data.observacoes ?? "",
    hrvRmssdRest: data.hrv_rmssd_rest,
    hrvSdnnRest: data.hrv_sdnn_rest,
    hrvNotes: data.hrv_notes ?? "",
    aiReportDraft: data.ai_report_draft,
    aiReportFinal: data.ai_report_final,
    appliedToFichaAt: data.applied_to_ficha_at,
    stages: [],
  };
}

export async function getPhysiologyAssessment(assessmentId: string): Promise<PhysiologyAssessmentDetail> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  await assertAssessmentInOrg(admin, assessmentId, organizationId);

  const { data: header, error: headerError } = await admin
    .from("avaliacoes_fisiologicas")
    .select(DETAIL_COLUMNS)
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
    ...mapSummaryRow(header),
    observacoes: header.observacoes ?? "",
    hrvRmssdRest: header.hrv_rmssd_rest,
    hrvSdnnRest: header.hrv_sdnn_rest,
    hrvNotes: header.hrv_notes ?? "",
    aiReportDraft: header.ai_report_draft,
    aiReportFinal: header.ai_report_final,
    appliedToFichaAt: header.applied_to_ficha_at,
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
  hrvRmssdRest: number | null;
  hrvSdnnRest: number | null;
  hrvNotes: string;
  // Sempre a lista completa de estágios atual — substitui tudo que já
  // existia (mais simples que diff de linhas adicionadas/removidas, e o
  // volume por avaliação é sempre pequeno, poucos estágios).
  stages: Omit<PhysiologyStage, "id">[];
}

/**
 * Salva cabeçalho (inclui os limiares marcados manualmente pelo
 * treinador e HRV de repouso) + substitui os estágios pela lista atual da
 * tela. Não mexe em `published`/`ai_report_final` — isso é ação separada
 * (ver publishPhysiologyAssessment/saveFinalReport), pra nunca publicar
 * pro aluno como efeito colateral de um simples "salvar rascunho".
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
      hrv_rmssd_rest: input.hrvRmssdRest,
      hrv_sdnn_rest: input.hrvSdnnRest,
      hrv_notes: input.hrvNotes || null,
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

/**
 * Publica (ou despublica) a avaliação pro aluno — RLS só libera leitura
 * pro aluno quando `published = true` (ver migração 0027). Ação separada
 * de salvar o rascunho de propósito: publicar é uma decisão consciente do
 * treinador, nunca um efeito colateral de "Salvar avaliação".
 */
export async function setPhysiologyAssessmentPublished(assessmentId: string, published: boolean): Promise<void> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  await assertAssessmentInOrg(admin, assessmentId, organizationId);

  const { error } = await admin.from("avaliacoes_fisiologicas").update({ published }).eq("id", assessmentId);
  if (error) {
    console.error("[cockpit] erro do Postgres ao publicar avaliação fisiológica:", error.message);
    throw new Error("Não foi possível atualizar a publicação. Tente novamente.");
  }
}

function formatIntensityLabel(tipoTeste: TipoTeste, potenciaWatts: number | null, pace: string | null): string {
  if (tipoTeste === "corrida") return pace ? `${pace}/km` : "—";
  return potenciaWatts != null ? `${potenciaWatts} W` : "—";
}

/**
 * Gera (via Gemini) um rascunho de parecer técnico sobre a avaliação —
 * grava em ai_report_draft e devolve o texto pro treinador revisar/editar
 * na tela antes de salvar como versão final (saveFinalPhysiologyReport).
 * Nunca chega ao aluno direto daqui.
 */
export async function generatePhysiologyReportDraft(assessmentId: string): Promise<string> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  const alunoId = await assertAssessmentInOrg(admin, assessmentId, organizationId);

  const [{ data: aluno }, { data: header }, { data: stageRows }] = await Promise.all([
    admin.from("alunos").select("nome").eq("id", alunoId).single(),
    admin
      .from("avaliacoes_fisiologicas")
      .select("data_avaliacao, tipo_teste, observacoes, lt1_potencia, lt1_fc, lt2_potencia, lt2_fc, hrv_rmssd_rest")
      .eq("id", assessmentId)
      .single(),
    admin
      .from("estagios_teste_lactato")
      .select("estagio_numero, tempo_minutos, potencia_watts, pace, glicemia, fc_bpm, lactato_mmol, pse")
      .eq("avaliacao_id", assessmentId)
      .order("estagio_numero", { ascending: true }),
  ]);

  if (!aluno || !header) throw new Error("Avaliação não encontrada.");

  const draft = await generateReportDraftFromGemini({
    athleteName: aluno.nome,
    tipoTeste: header.tipo_teste,
    dataAvaliacao: header.data_avaliacao,
    stages: (stageRows ?? []).map((s) => ({
      estagioNumero: s.estagio_numero,
      intensity: formatIntensityLabel(header.tipo_teste, s.potencia_watts, s.pace),
      lactato: s.lactato_mmol,
      fc: s.fc_bpm,
      glicemia: s.glicemia,
      pse: s.pse,
    })),
    lt1Intensity: header.lt1_potencia != null ? `${header.lt1_potencia} W` : null,
    lt1Fc: header.lt1_fc,
    lt2Intensity: header.lt2_potencia != null ? `${header.lt2_potencia} W` : null,
    lt2Fc: header.lt2_fc,
    hrvRmssdRest: header.hrv_rmssd_rest,
    observacoes: header.observacoes,
  });

  const { error } = await admin.from("avaliacoes_fisiologicas").update({ ai_report_draft: draft }).eq("id", assessmentId);
  if (error) {
    console.error("[cockpit] erro do Postgres ao salvar rascunho de parecer:", error.message);
  }

  return draft;
}

/** Salva a versão final do parecer (editada pelo treinador) — o que o aluno vê quando a avaliação é publicada. */
export async function saveFinalPhysiologyReport(assessmentId: string, text: string): Promise<void> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  await assertAssessmentInOrg(admin, assessmentId, organizationId);

  const { error } = await admin.from("avaliacoes_fisiologicas").update({ ai_report_final: text }).eq("id", assessmentId);
  if (error) {
    console.error("[cockpit] erro do Postgres ao salvar parecer final:", error.message);
    throw new Error("Não foi possível salvar o parecer. Tente novamente.");
  }
}

export interface ApplyThresholdsToFichaInput {
  ftpWatts: number | null; // ciclismo
  thresholdPace: string | null; // corrida
  hrThreshold: number | null; // ciclismo ou corrida
}

/**
 * Grava o(s) limiar(es) da avaliação na ficha do aluno (FTP/FC de limiar
 * pra ciclismo, pace/FC de limiar pra corrida) — sempre chamado depois de
 * o treinador confirmar explicitamente na tela exatamente o que vai
 * mudar (a confirmação é responsabilidade da UI; aqui só grava o que foi
 * passado). Exige que o aluno já tenha o perfil da modalidade cadastrado
 * (cycling_profile/running_profile) — evita criar um perfil pela metade
 * por um atalho, o cadastro completo continua sendo feito na ficha.
 */
export async function applyThresholdsToFicha(assessmentId: string, input: ApplyThresholdsToFichaInput): Promise<void> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  const alunoId = await assertAssessmentInOrg(admin, assessmentId, organizationId);

  const { data: assessment } = await admin.from("avaliacoes_fisiologicas").select("tipo_teste").eq("id", assessmentId).single();
  const tipoTeste = assessment?.tipo_teste ?? "ciclismo";

  const { data: aluno } = await admin.from("alunos").select("cycling_profile, running_profile").eq("id", alunoId).maybeSingle();
  if (!aluno) throw new Error("Aluno não encontrado.");

  if (tipoTeste === "corrida") {
    if (!aluno.running_profile) {
      throw new Error("Complete o perfil de corrida do aluno na ficha antes de aplicar os limiares.");
    }
    const running = { ...aluno.running_profile, hrThreshold: input.hrThreshold ?? aluno.running_profile.hrThreshold };
    if (input.thresholdPace) running.thresholdPace = input.thresholdPace;

    const { error } = await admin.from("alunos").update({ running_profile: running }).eq("id", alunoId);
    if (error) {
      console.error("[cockpit] erro do Postgres ao aplicar limiares (corrida):", error.message);
      throw new Error("Não foi possível atualizar a ficha do aluno. Tente novamente.");
    }
  } else {
    if (!aluno.cycling_profile) {
      throw new Error("Complete o perfil de ciclismo do aluno na ficha antes de aplicar os limiares.");
    }
    const cycling = { ...aluno.cycling_profile, hrThreshold: input.hrThreshold ?? aluno.cycling_profile.hrThreshold };
    if (input.ftpWatts != null) cycling.ftpWatts = input.ftpWatts;

    const { error } = await admin.from("alunos").update({ cycling_profile: cycling }).eq("id", alunoId);
    if (error) {
      console.error("[cockpit] erro do Postgres ao aplicar limiares (ciclismo):", error.message);
      throw new Error("Não foi possível atualizar a ficha do aluno. Tente novamente.");
    }
  }

  await admin.from("avaliacoes_fisiologicas").update({ applied_to_ficha_at: new Date().toISOString() }).eq("id", assessmentId);
}
