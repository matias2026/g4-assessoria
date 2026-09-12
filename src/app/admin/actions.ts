"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfileRole } from "@/lib/supabase/types";

export interface CreateAccountState {
  error: string | null;
  success: string | null;
}

const initialState: CreateAccountState = { error: null, success: null };

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data } = await supabase.from("profiles").select("role, active").eq("id", user.id).single();
  // O generic da tabela via @supabase/ssr não propaga o tipo da coluna aqui;
  // o shape é conhecido (profiles.role/active) então a asserção é segura.
  const profile = data as { role: ProfileRole; active: boolean } | null;
  if (profile?.role !== "admin" || !profile.active) throw new Error("Acesso restrito ao administrador.");
  return user.id;
}

const roleLabel: Record<ProfileRole, string> = { coach: "treinador", athlete: "aluno", admin: "administrador" };

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
}

// Lógica compartilhada por "Criar conta" (formulário direto) e "Aprovar"
// (pedido de acesso). A trava de 50 atletas é reforçada duas vezes: aqui
// (pré-checagem, pra não criar um usuário órfão no Auth à toa) e no banco
// (trigger enforce_athlete_cap, que vale de verdade mesmo se alguém pular
// esta função e inserir direto via SQL/service role).
async function createAccountCore({ email, password, fullName, role }: CreateAccountInput): Promise<string | null> {
  if (!email || !password || !fullName) return "Preencha nome, e-mail e senha.";
  if (password.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (!["coach", "athlete", "admin"].includes(role)) return "Papel inválido.";

  const admin = createAdminClient();

  if (role === "athlete") {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "athlete");
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
    .insert({ id: created.user.id, role, full_name: fullName });

  if (profileError) {
    // Reverte o usuário do Auth pra não deixar login órfão sem perfil.
    await admin.auth.admin.deleteUser(created.user.id);
    if (profileError.message.includes("Limite de 50 atletas")) return "Limite de 50 atletas cadastrados atingido.";
    console.error("[admin] erro do Postgres ao criar perfil:", profileError.message);
    return "Não foi possível criar a conta. Tente novamente.";
  }

  return null;
}

// Cria login de treinador ou aluno diretamente. Não existe autocadastro no
// site — esta é uma das duas portas de entrada pra conta nova (a outra é
// aprovar um pedido em /solicitar-acesso), ambas atrás do login do admin.
export async function createAccount(
  _prevState: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as ProfileRole;

  const error = await createAccountCore({ email, password, fullName, role });
  if (error) return { ...initialState, error };

  revalidatePath("/admin");
  return { error: null, success: `Conta de ${roleLabel[role]} criada.` };
}

// Suspende/reativa uma conta. Suspensa: login passa a ser recusado (checagem
// nos Server Actions de login) e o RLS corta o acesso mesmo pra quem já
// tinha sessão aberta. Um admin não pode suspender a própria conta (evita
// se trancar pra fora do painel).
export async function toggleActive(profileId: string, active: boolean): Promise<void> {
  const adminId = await requireAdmin();

  if (profileId === adminId) {
    throw new Error("Você não pode suspender a própria conta.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ active }).eq("id", profileId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export interface ApproveRequestResult {
  error: string | null;
}

// Aprova um pedido de /solicitar-acesso: cria a conta de verdade (mesma
// lógica do "Criar conta") com a senha que a própria pessoa escolheu ao
// pedir acesso (ver password em access_requests). Some do banco logo em
// seguida — não precisa mais ficar guardada depois de virar a senha real
// no Supabase Auth.
export async function approveRequest(requestId: string): Promise<ApproveRequestResult> {
  const adminId = await requireAdmin();
  const admin = createAdminClient();

  const { data: reqRow } = await admin
    .from("access_requests")
    .select("id, full_name, email, password, role_requested, status")
    .eq("id", requestId)
    .single();

  if (!reqRow || reqRow.status !== "pending") {
    return { error: "Pedido não encontrado ou já processado." };
  }

  if (!reqRow.password) {
    return { error: "Este pedido não tem senha definida (feito antes de uma atualização). Peça pra pessoa enviar o pedido de novo." };
  }

  const error = await createAccountCore({
    email: reqRow.email,
    password: reqRow.password,
    fullName: reqRow.full_name,
    role: reqRow.role_requested,
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
  const adminId = await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("access_requests")
    .update({ status: "denied", reviewed_by: adminId, reviewed_at: new Date().toISOString(), password: null })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { error: null };
}
