"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfileRole } from "@/lib/supabase/types";
import { calculateAge } from "@/lib/workout-metrics";

export interface AdminIdentity {
  userId: string;
  organizationId: string;
  isPlatformAdmin: boolean;
}

// Devolve também organization_id: quase toda escrita deste arquivo usa o
// client de service role (bypassa RLS), então o isolamento entre
// organizações depende de filtrar explicitamente por isso aqui — RLS
// sozinha não cobre esse caminho.
export async function requireAdmin(): Promise<AdminIdentity> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data } = await supabase
    .from("profiles")
    .select("role, active, organization_id, is_platform_admin")
    .eq("id", user.id)
    .single();
  // O generic da tabela via @supabase/ssr não propaga o tipo da coluna aqui;
  // o shape é conhecido (profiles.role/active/organization_id) então a
  // asserção é segura.
  const profile = data as
    | { role: ProfileRole; active: boolean; organization_id: string; is_platform_admin: boolean }
    | null;
  if (profile?.role !== "admin" || !profile.active) throw new Error("Acesso restrito ao administrador.");
  return { userId: user.id, organizationId: profile.organization_id, isPlatformAdmin: profile.is_platform_admin };
}

// Mapa dos códigos de erro estáveis do Supabase Auth (não o texto da
// mensagem, que vem em inglês e pode mudar) — ver
// https://supabase.com/docs/guides/auth/debugging/error-codes
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  email_exists: "Já existe uma conta cadastrada com esse e-mail.",
  weak_password: "Senha muito fraca — use pelo menos 8 caracteres.",
  email_address_invalid: "E-mail inválido.",
  validation_failed: "Dados inválidos — confira o e-mail e a senha.",
};

function translateAuthError(error: { code?: string; message: string }): string {
  if (error.code && AUTH_ERROR_MESSAGES[error.code]) return AUTH_ERROR_MESSAGES[error.code];
  // Código não mapeado: loga o original pra investigar, mas nunca mostra
  // texto técnico/em inglês pro admin.
  console.error("[admin] erro do Supabase Auth não mapeado:", error.code, error.message);
  return "Não foi possível criar a conta. Tente novamente.";
}

interface CreateAccountInput {
  email: string;
  password: string;
  fullName: string;
  role: ProfileRole;
  phone?: string | null;
  age?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  medicalNotes?: string;
  modalidade?: string | null;
  coachNotes?: string;
}

// Lógica compartilhada por "Criar conta" (formulário direto) e "Aprovar"
// (pedido de acesso). A trava de 50 atletas é reforçada duas vezes: aqui
// (pré-checagem, pra não criar um usuário órfão no Auth à toa) e no banco
// (trigger enforce_athlete_cap, que vale de verdade mesmo se alguém pular
// esta função e inserir direto via SQL/service role).
async function createAccountCore({
  email,
  password: rawPassword,
  fullName,
  role,
  phone,
  age,
  weightKg,
  heightCm,
  medicalNotes,
  modalidade,
  coachNotes,
  organizationId,
}: CreateAccountInput & { organizationId: string }): Promise<string | null> {
  // Trim aqui também (não só em quem chama) — cobre "Criar conta",
  // "Aprovar pedido" e o cadastro de aluno pelo Cockpit de uma vez só,
  // pra um espaço colado do WhatsApp nunca virar "dados inválidos" sem
  // nenhuma pista visível pra quem está digitando.
  const password = rawPassword.trim();
  if (!email || !password || !fullName) return "Preencha nome, e-mail e senha.";
  if (password.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (!["coach", "athlete", "admin"].includes(role)) return "Papel inválido.";

  const admin = createAdminClient();

  if (role === "athlete") {
    // Limite de 50 é por organização, não da plataforma inteira — sem o
    // filtro de organization_id aqui, uma assessoria travaria o cadastro
    // por causa do volume de alunos de outra assessoria.
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "athlete")
      .eq("organization_id", organizationId);
    if (count != null && count >= 50) return "Limite de 50 atletas cadastrados atingido.";
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) return translateAuthError(createError);
  if (!created.user) return "Falha ao criar usuário.";

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: created.user.id, role, full_name: fullName, organization_id: organizationId });

  if (profileError) {
    // Reverte o usuário do Auth pra não deixar login órfão sem perfil.
    await admin.auth.admin.deleteUser(created.user.id);
    if (profileError.message.includes("Limite de 50 atletas")) return "Limite de 50 atletas cadastrados atingido.";
    console.error("[admin] erro do Postgres ao criar perfil:", profileError.message);
    return "Não foi possível criar a conta. Tente novamente.";
  }

  // Sem isso, um aluno aprovado por aqui fica com login mas sem ficha:
  // não aparece na roster do Cockpit (listStudents lê de alunos) nem vê
  // o próprio treino na área do atleta (resolveWorkout também lê de
  // alunos). O perfil completo (modalidade, medidas etc.) continua sendo
  // preenchido depois pelo treinador — isso só garante que a ficha exista.
  if (role === "athlete") {
    const { error: alunoError } = await admin.from("alunos").insert({
      organization_id: organizationId,
      user_id: created.user.id,
      nome: fullName,
      whatsapp: phone ?? null,
      age: age ?? null,
      peso: weightKg ?? null,
      altura: heightCm ?? null,
      medical_notes: medicalNotes?.trim() ?? "",
      modalidade: modalidade ?? null,
      coach_notes: coachNotes?.trim() ?? "",
    });

    if (alunoError) {
      await admin.from("profiles").delete().eq("id", created.user.id);
      await admin.auth.admin.deleteUser(created.user.id);
      console.error("[admin] erro do Postgres ao criar ficha do aluno:", alunoError.message);
      return "Não foi possível criar a conta. Tente novamente.";
    }
  }

  return null;
}

// Suspende/reativa uma conta. Suspensa: login passa a ser recusado (checagem
// nos Server Actions de login) e o RLS corta o acesso mesmo pra quem já
// tinha sessão aberta. Um admin não pode suspender a própria conta (evita
// se trancar pra fora do painel).
export async function toggleActive(profileId: string, active: boolean): Promise<void> {
  const { userId: adminId, organizationId, isPlatformAdmin } = await requireAdmin();

  if (profileId === adminId) {
    throw new Error("Você não pode suspender a própria conta.");
  }

  const admin = createAdminClient();
  // organization_id no filtro impede um admin de uma organização suspender/
  // reativar conta de outra organização só sabendo (ou adivinhando) o id do
  // perfil — a query simplesmente não acha a linha se for de outro tenant.
  let query = admin.from("profiles").update({ active }).eq("id", profileId);
  if (!isPlatformAdmin) query = query.eq("organization_id", organizationId);
  const { error } = await query;
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

// Exclui a conta por completo (Auth + perfil, via ON DELETE CASCADE em
// profiles.id → auth.users.id). Existe pra destravar contas criadas antes
// da senha ser escolhida pela própria pessoa (ver 0009_password_on_
// access_requests.sql) — sem excluir, o e-mail fica "já cadastrado" pra
// sempre e a pessoa não tem como pedir acesso de novo pra definir uma
// senha que funcione. Igual ao suspender: admin não pode excluir a
// própria conta.
export async function deleteAccount(profileId: string): Promise<void> {
  const { userId: adminId, organizationId, isPlatformAdmin } = await requireAdmin();

  if (profileId === adminId) {
    throw new Error("Você não pode excluir a própria conta.");
  }

  const admin = createAdminClient();

  // auth.admin.deleteUser não aceita filtro de organization_id (não é uma
  // query builder) — confirma antes que o perfil é da mesma organização,
  // senão um admin conseguiria excluir conta de outra assessoria só
  // sabendo o id.
  if (!isPlatformAdmin) {
    const { data: target } = await admin.from("profiles").select("organization_id").eq("id", profileId).single();
    if (!target || (target as { organization_id: string }).organization_id !== organizationId) {
      throw new Error("Conta não encontrada.");
    }
  }

  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) {
    console.error("[admin] erro ao excluir conta:", error.code, error.message);
    throw new Error("Não foi possível excluir a conta. Tente novamente.");
  }

  revalidatePath("/admin");
}

export interface ApproveRequestResult {
  error: string | null;
}

// Aprova um pedido de /solicitar-acesso: cria a conta de verdade com a
// senha que a própria pessoa escolheu ao pedir acesso (ver password em
// access_requests). Some do banco logo em seguida — não precisa mais
// ficar guardada depois de virar a senha real no Supabase Auth.
export async function approveRequest(requestId: string): Promise<ApproveRequestResult> {
  const { userId: adminId, organizationId, isPlatformAdmin } = await requireAdmin();
  const admin = createAdminClient();

  const { data: reqRow } = await admin
    .from("access_requests")
    .select(
      "id, full_name, email, phone, password, role_requested, status, birth_date, weight_kg, height_cm, medical_notes, modalidade, training_experience, organization_id"
    )
    .eq("id", requestId)
    .single();

  if (!reqRow || reqRow.status !== "pending") {
    return { error: "Pedido não encontrado ou já processado." };
  }

  // Impede um admin aprovar (e assim criar uma conta dentro da própria
  // organização) um pedido feito pra outra assessoria.
  if (!isPlatformAdmin && reqRow.organization_id !== organizationId) {
    return { error: "Pedido não encontrado ou já processado." };
  }

  if (!reqRow.password) {
    return { error: "Este pedido não tem senha definida (feito antes de uma atualização). Peça pra pessoa enviar o pedido de novo." };
  }

  // Sem experiência registrada ainda = FC estimada por idade é só ponto de
  // partida; já experiente vale a pena o treinador pedir um valor medido —
  // essa nota fica registrada direto na ficha do aluno.
  const experienceNote =
    reqRow.training_experience === "iniciante"
      ? "Informou no cadastro que é novato(a) — sem dado de treino real ainda, FC máxima é estimativa por idade."
      : reqRow.training_experience === "experiente"
        ? "Informou no cadastro que já tem experiência com treino/assessoria — vale pedir valores medidos (FC, FTP etc.) em vez de só estimar."
        : "";

  const error = await createAccountCore({
    email: reqRow.email,
    password: reqRow.password,
    fullName: reqRow.full_name,
    role: reqRow.role_requested,
    phone: reqRow.phone,
    age: reqRow.birth_date ? calculateAge(reqRow.birth_date) : null,
    weightKg: reqRow.weight_kg,
    heightCm: reqRow.height_cm,
    medicalNotes: reqRow.medical_notes ?? undefined,
    modalidade: reqRow.modalidade,
    coachNotes: experienceNote,
    // A conta nasce na organização do pedido, não necessariamente na do
    // admin que aprovou (hoje sempre a mesma — só existe 1 organização —
    // mas fica correto pra quando existir mais de uma).
    organizationId: reqRow.organization_id ?? organizationId,
  });

  if (error) return { error };

  await admin
    .from("access_requests")
    .update({ status: "approved", reviewed_by: adminId, reviewed_at: new Date().toISOString(), password: null })
    .eq("id", requestId);

  revalidatePath("/admin");
  return { error: null };
}

// Nega um pedido — só marca como negado, não cria nada. Ninguém é avisado
// automaticamente (sem e-mail no app); é o admin quem decide se responde.
export async function denyRequest(requestId: string): Promise<{ error: string | null }> {
  const { userId: adminId, organizationId, isPlatformAdmin } = await requireAdmin();
  const admin = createAdminClient();

  let query = admin
    .from("access_requests")
    .update({ status: "denied", reviewed_by: adminId, reviewed_at: new Date().toISOString(), password: null })
    .eq("id", requestId)
    .eq("status", "pending");
  if (!isPlatformAdmin) query = query.eq("organization_id", organizationId);
  const { error } = await query;

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { error: null };
}
