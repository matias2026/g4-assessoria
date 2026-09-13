"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { mapAlunoRow } from "@/lib/map-aluno-row";
import type { MockStudent } from "@/lib/mock-data";
import { requireCoachOrAdmin } from "./actions";

// Mesmo mapa de códigos estáveis do Supabase Auth usado em
// src/app/admin/actions.ts — duplicado aqui (arquivo pequeno) em vez de
// importar de outra área da rota, mesmo espírito de requireCoachOrAdmin/
// requireAdmin cada um na sua pasta.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  email_exists: "Já existe uma conta cadastrada com esse e-mail.",
  weak_password: "Senha muito fraca — use pelo menos 8 caracteres.",
  email_address_invalid: "E-mail inválido.",
  validation_failed: "Dados inválidos — confira o e-mail e a senha.",
};

function translateAuthError(error: { code?: string; message: string }): string {
  if (error.code && AUTH_ERROR_MESSAGES[error.code]) return AUTH_ERROR_MESSAGES[error.code];
  console.error("[cockpit] erro do Supabase Auth não mapeado:", error.code, error.message);
  return "Não foi possível criar a conta. Tente novamente.";
}

/** Lista os alunos cadastrados, em ordem alfabética. */
export async function listStudents(): Promise<MockStudent[]> {
  await requireCoachOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from("alunos").select("*").order("nome");

  if (error) throw new Error("Falha ao carregar os alunos cadastrados.");

  return (data ?? []).map(mapAlunoRow);
}

export interface CreateStudentInput {
  email: string;
  password: string;
  name: string;
  phone: string;
  discipline: string;
  secondaryDisciplines: string[];
  age: number | null;
  sex: MockStudent["sex"];
  heightCm: number | null;
  weightKg: number | null;
  bodyComposition: MockStudent["bodyComposition"];
  weightHistoryNotes: string;
  medicalNotes: string;
  cycling: MockStudent["cycling"];
  running: MockStudent["running"];
  strength: MockStudent["strength"];
  // Comentário geral do treinador sobre o aluno, visível pra ele em "Meu
  // perfil > Relatório do treinador" — sempre "" ao criar a conta (o
  // formulário só mostra o campo ao editar um aluno já existente).
  coachNotes: string;
}

/**
 * Cria a conta real do aluno (login + perfil + ficha completa) — as duas
 * portas de entrada de conta nova já existentes (criar direto no admin,
 * aprovar pedido de acesso) usam o mesmo padrão de
 * `admin.auth.admin.createUser` + revert em falha; esta é a terceira.
 */
export async function createStudentAccount(input: CreateStudentInput): Promise<MockStudent> {
  await requireCoachOrAdmin();

  if (!input.email || !input.password || !input.name) {
    throw new Error("Preencha nome, e-mail e senha.");
  }
  if (input.password.length < 8) {
    throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (createError) throw new Error(translateAuthError(createError));
  if (!created.user) throw new Error("Falha ao criar usuário.");

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: created.user.id, role: "athlete", full_name: input.name });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    console.error("[cockpit] erro do Postgres ao criar perfil do aluno:", profileError.message);
    if (profileError.message.includes("Limite de 50 atletas")) {
      throw new Error("Limite de 50 atletas cadastrados atingido.");
    }
    throw new Error("Não foi possível criar a conta. Tente novamente.");
  }

  const { data: alunoRow, error: alunoError } = await admin
    .from("alunos")
    .insert({
      user_id: created.user.id,
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
      coach_notes: input.coachNotes,
    })
    .select("*")
    .single();

  if (alunoError) {
    // Reverte perfil + usuário do Auth pra não deixar login órfão sem ficha.
    await admin.from("profiles").delete().eq("id", created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
    console.error("[cockpit] erro do Postgres ao criar aluno:", alunoError.message);
    throw new Error("Não foi possível salvar a ficha do aluno. Tente novamente.");
  }

  return mapAlunoRow(alunoRow);
}

export type StudentProfileInput = Omit<CreateStudentInput, "email" | "password">;

/**
 * Preenche a ficha de um aluno que já tem login (aprovado por
 * /solicitar-acesso, que só cria nome — ver admin/actions.ts) ou completa
 * dados de um aluno já cadastrado. Diferente de createStudentAccount: não
 * mexe em Auth/profiles, só atualiza a linha em alunos.
 */
export async function completeStudentProfile(id: string, input: StudentProfileInput): Promise<MockStudent> {
  await requireCoachOrAdmin();
  const admin = createAdminClient();

  const { data: alunoRow, error } = await admin
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
      coach_notes: input.coachNotes,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[cockpit] erro do Postgres ao atualizar ficha do aluno:", error.message);
    throw new Error("Não foi possível salvar a ficha do aluno. Tente novamente.");
  }

  return mapAlunoRow(alunoRow);
}
