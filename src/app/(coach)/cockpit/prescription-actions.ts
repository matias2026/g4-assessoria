"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { MockWorkoutDetail } from "@/lib/mock-data";
import { requireCoachOrAdmin } from "./actions";

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
  await requireCoachOrAdmin();
  const admin = createAdminClient();

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
 */
export async function sendPrescription(alunoId: string, dateIso: string, workout: MockWorkoutDetail): Promise<void> {
  await requireCoachOrAdmin();
  const admin = createAdminClient();

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
    },
    { onConflict: "aluno_id,data" }
  );

  if (error) {
    console.error("[cockpit] erro do Postgres ao enviar a prescrição:", error.message);
    throw new Error("Não foi possível enviar o treino. Tente novamente.");
  }
}
