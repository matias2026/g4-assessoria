"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapAlunoRow } from "@/lib/map-aluno-row";
import { buildPrescribedWorkout, type MockStudent, type MockWorkoutDetail } from "@/lib/mock-data";
import { refreshStravaToken } from "@/lib/strava/client";
import { pullStravaActivities } from "@/lib/strava/sync";
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

/** Lista os alunos cadastrados na própria organização, em ordem alfabética. */
export async function listStudents(): Promise<MockStudent[]> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("alunos")
    .select("*")
    .eq("organization_id", organizationId)
    .order("nome");

  if (error) throw new Error("Falha ao carregar os alunos cadastrados.");

  const students = (data ?? []).map(mapAlunoRow);

  // mapAlunoRow nasce sempre com stravaSynced: false (não é campo da ficha)
  // — aqui cruza com strava_tokens pra refletir a conexão de verdade, senão
  // o badge "Desconectado" no Monitoramento fica errado pra quem já conectou.
  const userIds = students.map((s) => s.userId).filter((id): id is string => id != null);
  if (userIds.length > 0) {
    const { data: tokens } = await admin.from("strava_tokens").select("profile_id").in("profile_id", userIds);
    const connected = new Set((tokens ?? []).map((t) => t.profile_id));
    for (const student of students) {
      if (student.userId && connected.has(student.userId)) student.stravaSynced = true;
    }
  }

  return students;
}

/**
 * Treinos de hoje já enviados (`enviado = true`), por aluno — o que
 * alimenta "Analisar treino do aluno" e "Treinos cadastrados" ao carregar
 * o Cockpit. Rascunho nunca aparece aqui (mesma trava do painel do
 * aluno). Aluno sem treino enviado hoje simplesmente não entra no mapa —
 * as abas já sabem mostrar "sem treino" nesse caso, em vez de inventar
 * um exemplo genérico.
 */
export async function listTodayWorkouts(students: MockStudent[]): Promise<Record<string, MockWorkoutDetail>> {
  await requireCoachOrAdmin();
  if (students.length === 0) return {};

  const admin = createAdminClient();
  const todayIso = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("treinos")
    .select(
      "aluno_id, titulo, modalidade, descricao, concluido, conteudo, rpe_esforco, sensacao, comentarios, atividade_fit, coach_feedback, ai_feedback_draft"
    )
    .in(
      "aluno_id",
      students.map((s) => s.id)
    )
    .eq("data", todayIso)
    .eq("enviado", true);

  if (error) {
    console.error("[cockpit] erro do Postgres ao buscar treinos de hoje:", error.message);
    return {};
  }

  const studentsById = new Map(students.map((s) => [s.id, s]));
  const workouts: Record<string, MockWorkoutDetail> = {};

  for (const row of data ?? []) {
    if (!row.aluno_id) continue;
    const student = studentsById.get(row.aluno_id);
    if (!student) continue;

    workouts[row.aluno_id] = buildPrescribedWorkout(
      { id: student.id, name: student.name, phone: student.phone },
      "Hoje",
      row
    );
  }

  return workouts;
}

/**
 * Salva o feedback do treinador (com ou sem apoio de IA) no treino de hoje
 * do aluno — antes o composer (AiFeedbackComposer.tsx) só marcava
 * "Enviado ✓" na tela e nunca gravava nada, então o aluno nunca recebia o
 * feedback de verdade e ele sumia ao recarregar a página. Sempre no treino
 * de hoje, mesmo alvo que listTodayWorkouts busca.
 */
export async function submitCoachFeedback(studentId: string, feedback: string): Promise<void> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  // Confirma que o aluno é da própria organização antes de gravar —
  // sem isso, quem chamasse essa Server Action passando o id de um aluno
  // de outra organização conseguiria escrever feedback lá (o client usa
  // service role, que ignora RLS).
  const { data: alunoRow } = await admin
    .from("alunos")
    .select("id")
    .eq("id", studentId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!alunoRow) throw new Error("Aluno não encontrado.");

  const { error } = await admin
    .from("treinos")
    .update({ coach_feedback: feedback })
    .eq("aluno_id", studentId)
    .eq("data", todayIso)
    .eq("enviado", true);

  if (error) {
    console.error("[cockpit] erro ao salvar feedback do treinador:", error.message);
    throw new Error("Não foi possível salvar o feedback agora.");
  }
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
  const { organizationId } = await requireCoachOrAdmin();

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
    .insert({ id: created.user.id, role: "athlete", full_name: input.name, organization_id: organizationId });

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
      organization_id: organizationId,
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
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();

  // organization_id no filtro do update impede um treinador de uma
  // organização editar a ficha de um aluno de outra só sabendo o id
  // (service role ignora RLS, então essa checagem tem que estar aqui).
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
    .eq("organization_id", organizationId)
    .select("*")
    .single();

  if (error) {
    console.error("[cockpit] erro do Postgres ao atualizar ficha do aluno:", error.message);
    throw new Error("Não foi possível salvar a ficha do aluno. Tente novamente.");
  }

  return mapAlunoRow(alunoRow);
}

// Igual à sincronização automática da conexão (ver api/strava/callback/
// route.ts) — 30 pra trazer um histórico útil de quem já estava conectado
// antes dessa quantidade existir, não só as próximas 20 do botão manual do
// aluno.
const BULK_SYNC_ACTIVITIES_PER_STUDENT = 30;

export interface SyncAllStudentsStravaResult {
  studentsSynced: number;
  activitiesSynced: number;
}

/**
 * "Atualizar Strava de todos" no Cockpit — puxa atividades de todo aluno
 * da organização que já tem o Strava conectado, sem esperar o próprio
 * aluno clicar em "Sincronizar agora" (dashboard/strava-actions.ts). Usa a
 * mesma lógica de busca/gravação (src/lib/strava/sync.ts), só trocando de
 * quem é "o usuário logado" pra "cada aluno com strava_tokens" — útil
 * sobretudo pra atualizar de uma vez quem conectou antes de alguma
 * melhoria na sincronização existir.
 */
export async function syncAllStudentsStrava(): Promise<SyncAllStudentsStravaResult> {
  const { organizationId } = await requireCoachOrAdmin();
  const admin = createAdminClient();

  const { data: alunos } = await admin.from("alunos").select("user_id").eq("organization_id", organizationId);
  const userIds = (alunos ?? []).map((a) => a.user_id).filter((id): id is string => id != null);

  if (userIds.length === 0) return { studentsSynced: 0, activitiesSynced: 0 };

  const { data: tokenRows } = await admin.from("strava_tokens").select("*").in("profile_id", userIds);

  let studentsSynced = 0;
  let activitiesSynced = 0;

  for (const tokenRow of tokenRows ?? []) {
    try {
      let accessToken = tokenRow.access_token;
      const isExpired = new Date(tokenRow.expires_at).getTime() <= Date.now();

      if (isExpired) {
        const refreshed = await refreshStravaToken(tokenRow.refresh_token);
        accessToken = refreshed.access_token;
        await admin
          .from("strava_tokens")
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("profile_id", tokenRow.profile_id);
      }

      const { synced } = await pullStravaActivities(admin, tokenRow.profile_id, accessToken, BULK_SYNC_ACTIVITIES_PER_STUDENT);
      studentsSynced += 1;
      activitiesSynced += synced;
    } catch (e) {
      console.error("[cockpit] erro ao sincronizar Strava em lote para", tokenRow.profile_id, ":", e instanceof Error ? e.message : e);
    }
  }

  revalidatePath("/cockpit");
  return { studentsSynced, activitiesSynced };
}
