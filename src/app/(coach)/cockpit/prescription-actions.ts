"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { MockWorkoutDetail } from "@/lib/mock-data";
import { requireCoachOrAdmin } from "./actions";

// Confirma que o aluno é da própria organização antes de escrever em
// `treinos` — saveDraft/sendPrescription usam upsert, que criaria uma
// linha nova pra qualquer aluno_id passado; sem essa checagem, um id de
// aluno de outra organização seria aceito de boa (service role ignora RLS).
async function assertStudentInOrg(
  admin: ReturnType<typeof createAdminClient>,
  alunoId: string,
  organizationId: string
) {
  const { data } = await admin.from("alunos").select("id").eq("id", alunoId).eq("organization_id", organizationId).maybeSingle();
  if (!data) throw new Error("Aluno não encontrado.");
}

function draftSnapshot(workout: MockWorkoutDetail) {
  return {
    title: workout.title,
    discipline: workout.discipline,
    description: workout.description,
    prescription: workout.prescription,
    structuredIntervals: workout.structuredIntervals,
    trainingSessions: workout.trainingSessions,
    powerZones: workout.powerZones,
    planned: workout.planned,
  };
}

/**
 * "Salvar prescrição": guarda o rascunho em `treinos.rascunho` — nunca
 * toca titulo/modalidade/descricao/conteudo/enviado, então o aluno
 * continua vendo (ou não vendo nada) exatamente como estava até o
 * treinador clicar em "Enviar treino". Upsert por aluno_id + data: um
 * rascunho por aluno por dia.
 */
export async function saveDraft(alunoId: string, dateIso: string, workout: MockWorkoutDetail): Promise<void> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  await assertStudentInOrg(admin, alunoId, organizationId);

  const { error } = await admin
    .from("treinos")
    .upsert({ aluno_id: alunoId, data: dateIso, rascunho: draftSnapshot(workout) }, { onConflict: "aluno_id,data" });

  if (error) {
    console.error("[cockpit] erro do Postgres ao salvar o rascunho da prescrição:", error.message);
    throw new Error("Não foi possível salvar a prescrição. Tente novamente.");
  }
}

/**
 * "Enviar treino": publica de vez — copia o estado atual do formulário
 * pra titulo/modalidade/descricao/conteudo (o que a página do aluno lê)
 * e marca `enviado = true`. Também atualiza o rascunho junto, pra reabrir
 * a prescrição depois continuar a partir do que foi enviado por último.
 *
 * Zera explicitamente os campos de conclusão (concluido, rpe/sensação/
 * comentários, duração/distância/TSS reais, arquivo .FIT) — sem isso, um
 * upsert só atualiza as colunas do payload, então reenviar um treino novo
 * pra uma data que já tinha um treino concluído antes fazia o treino novo
 * já nascer "Concluído" com os dados (e o arquivo .FIT) do treino anterior.
 */
export async function sendPrescription(alunoId: string, dateIso: string, workout: MockWorkoutDetail): Promise<void> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  await assertStudentInOrg(admin, alunoId, organizationId);

  const { error } = await admin.from("treinos").upsert(
    {
      aluno_id: alunoId,
      data: dateIso,
      rascunho: draftSnapshot(workout),
      modalidade: workout.discipline,
      titulo: workout.title,
      descricao: workout.description,
      enviado: true,
      conteudo: {
        prescription: workout.prescription,
        structuredIntervals: workout.structuredIntervals,
        trainingSessions: workout.trainingSessions,
        powerZones: workout.powerZones,
        planned: workout.planned,
      },
      concluido: false,
      duracao_real: null,
      distancia_real: null,
      tss_real: null,
      rpe_esforco: null,
      sensacao: null,
      comentarios: null,
      arquivo_fit_path: null,
      atividade_fit: null,
    },
    { onConflict: "aluno_id,data" }
  );

  if (error) {
    console.error("[cockpit] erro do Postgres ao enviar a prescrição:", error.message);
    throw new Error("Não foi possível enviar o treino. Tente novamente.");
  }
}
