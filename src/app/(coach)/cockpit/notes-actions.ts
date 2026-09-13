"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCoachOrAdmin } from "./actions";

/**
 * Notas privadas do treinador sobre um aluno específico (Card "Notas do
 * treinador" no Monitoramento) — nunca aparecem pro aluno, diferente de
 * `alunos.coach_notes` ("Relatório do treinador", que é lido por ele em
 * "Meu perfil"). Vivem numa tabela própria (aluno_notes) sem nenhuma RLS
 * pra atleta, então a privacidade não depende só do app não mostrar.
 */
export async function getPrivateNotes(alunoId: string): Promise<string> {
  await requireCoachOrAdmin();
  const admin = createAdminClient();

  const { data } = await admin.from("aluno_notes").select("notes").eq("aluno_id", alunoId).single();
  return data?.notes ?? "";
}

export async function savePrivateNotes(alunoId: string, notes: string): Promise<void> {
  await requireCoachOrAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("aluno_notes")
    .upsert({ aluno_id: alunoId, notes, updated_at: new Date().toISOString() }, { onConflict: "aluno_id" });

  if (error) {
    console.error("[cockpit] erro do Postgres ao salvar notas privadas:", error.message);
    throw new Error("Não foi possível salvar as notas. Tente novamente.");
  }
}
