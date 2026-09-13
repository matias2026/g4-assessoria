"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { MockWorkoutDetail } from "@/lib/mock-data";
import { requireCoachOrAdmin } from "./actions";

/**
 * Salva a prescrição do dia em `treinos` (upsert por aluno_id + data) —
 * sem isso, "Salvar prescrição" só atualizava o estado em memória do
 * Cockpit (CockpitTabs), então o aluno nunca via o treino de verdade,
 * só o exemplo genérico da modalidade (buildExampleWorkout). Um treino
 * por aluno por dia: salvar de novo na mesma data substitui o anterior.
 */
export async function savePrescription(alunoId: string, dateIso: string, workout: MockWorkoutDetail): Promise<void> {
  await requireCoachOrAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("treinos").upsert(
    {
      aluno_id: alunoId,
      data: dateIso,
      modalidade: workout.discipline,
      titulo: workout.title,
      descricao: workout.description,
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
    console.error("[cockpit] erro do Postgres ao salvar a prescrição:", error.message);
    throw new Error("Não foi possível salvar a prescrição. Tente novamente.");
  }
}
