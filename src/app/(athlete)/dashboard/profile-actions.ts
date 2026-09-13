"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { mapAlunoRow } from "@/lib/map-aluno-row";
import type { StudentProfileInput } from "@/app/(coach)/cockpit/students-actions";
import type { MockStudent } from "@/lib/mock-data";

// Autoatendimento do aluno em "Meu perfil": ele só pode ler/editar a
// própria linha em `alunos` (achada pelo user_id da sessão), nunca a de
// outro aluno — diferente de students-actions.ts, que atende o
// treinador/admin sobre qualquer aluno. Mesmo padrão de client dos outros
// arquivos: sessão só pra identidade, admin client pra ler/escrever de
// verdade (o generic do @supabase/ssr não propaga em insert/update).
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

/** Busca a ficha do aluno logado. Retorna null se não houver sessão ou ficha vinculada. */
export async function getOwnProfile(): Promise<MockStudent | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin.from("alunos").select("*").eq("user_id", user.id).single();
  if (!data) return null;

  return mapAlunoRow(data);
}

/** "Minha ficha": o próprio aluno completa/edita os dados corporais e por modalidade. */
export async function updateOwnProfile(input: StudentProfileInput): Promise<MockStudent> {
  const alunoId = await requireOwnAlunoId();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("alunos")
    .update({
      nome: input.name,
      whatsapp: input.phone || null,
      modalidade: input.discipline,
      ftp: input.cycling?.ftpWatts ?? null,
      peso: input.weightKg,
      altura: input.heightCm,
      secondary_disciplines: input.secondaryDisciplines,
      age: input.age,
      sex: input.sex,
      body_composition: input.bodyComposition,
      weight_history_notes: input.weightHistoryNotes,
      medical_notes: input.medicalNotes,
      cycling_profile: input.cycling,
      running_profile: input.running,
      strength_profile: input.strength,
    })
    .eq("id", alunoId)
    .select("*")
    .single();

  if (error) {
    console.error("[dashboard] erro do Postgres ao atualizar a própria ficha do aluno:", error.message);
    throw new Error("Não foi possível salvar sua ficha. Tente novamente.");
  }

  revalidatePath("/dashboard/ficha");
  return mapAlunoRow(data);
}

/** "Relatório": o aluno escreve/edita livremente como o treino/a semana foi. */
export async function updateAthleteReport(text: string): Promise<void> {
  const alunoId = await requireOwnAlunoId();
  const admin = createAdminClient();

  const { error } = await admin.from("alunos").update({ athlete_report: text }).eq("id", alunoId);
  if (error) {
    console.error("[dashboard] erro do Postgres ao salvar o relatório do aluno:", error.message);
    throw new Error("Não foi possível salvar o relatório. Tente novamente.");
  }

  revalidatePath("/dashboard/relatorio");
}

/**
 * "Alterar senha": reautentica com a senha atual antes de trocar — evita
 * que uma sessão esquecida aberta num aparelho compartilhado baste pra
 * trocar a senha sem confirmar quem está mesmo pedindo a troca.
 */
export async function updateOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error("A nova senha precisa ter pelo menos 8 caracteres.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Não autenticado.");

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) throw new Error("Senha atual incorreta.");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    console.error("[dashboard] erro do Supabase Auth ao trocar senha:", error.code, error.message);
    throw new Error("Não foi possível alterar a senha. Tente novamente.");
  }
}
