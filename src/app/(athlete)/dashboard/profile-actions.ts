"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { mapAlunoRow } from "@/lib/map-aluno-row";
import type { StudentProfileInput } from "@/app/(coach)/cockpit/students-actions";
import { mockStudents, PREVIEW_DISCIPLINES, type MockStudent } from "@/lib/mock-data";
import type { ProfileRole } from "@/lib/supabase/types";

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

export interface OwnProfileResult {
  student: MockStudent | null;
  isAdmin: boolean;
  // true quando `student` é um exemplo (mockStudents) mostrado pro admin,
  // que não tem ficha própria em `alunos` — mesma ideia já usada pro
  // treino do dia em dashboard/page.tsx (resolveWorkout).
  isPreview: boolean;
}

/**
 * Busca a ficha do aluno logado. Se for admin sem ficha própria, devolve
 * um exemplo (mockStudents) da modalidade pedida — só pra ele conseguir
 * ver as telas de "Meu perfil" sem precisar de uma conta real de aluno
 * (mesma prévia que já existe pro treino do dia).
 */
export async function getOwnProfile(previewDiscipline?: string): Promise<OwnProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { student: null, isAdmin: false, isPreview: false };

  const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = (profileData as { role: ProfileRole } | null)?.role === "admin";

  const admin = createAdminClient();
  const { data } = await admin.from("alunos").select("*").eq("user_id", user.id).single();
  if (data) return { student: mapAlunoRow(data), isAdmin, isPreview: false };

  if (isAdmin) {
    const discipline =
      previewDiscipline && PREVIEW_DISCIPLINES.includes(previewDiscipline) ? previewDiscipline : PREVIEW_DISCIPLINES[0];
    const preview = mockStudents.find((s) => s.discipline === discipline) ?? mockStudents[0];
    return { student: preview, isAdmin, isPreview: true };
  }

  return { student: null, isAdmin, isPreview: false };
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
export async function updateOwnPassword(currentPasswordRaw: string, newPasswordRaw: string): Promise<void> {
  // Trim pra não deixar espaço invisível (comum em senha compartilhada por
  // WhatsApp) virar "senha atual incorreta" sem nenhuma pista visível.
  const currentPassword = currentPasswordRaw.trim();
  const newPassword = newPasswordRaw.trim();

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
