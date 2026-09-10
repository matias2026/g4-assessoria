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

// Cria login de treinador ou aluno. Não existe autocadastro no site — esta é
// a única porta de entrada para novas contas, por isso fica atrás do login
// separado do admin. A trava de 50 atletas é reforçada duas vezes: aqui
// (pré-checagem, pra não criar um usuário órfão no Auth à toa) e no banco
// (trigger enforce_athlete_cap, que vale de verdade mesmo se alguém pular
// esta função e inserir direto via SQL/service role).
export async function createAccount(
  _prevState: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as ProfileRole;

  if (!email || !password || !fullName) {
    return { ...initialState, error: "Preencha nome, e-mail e senha." };
  }
  if (password.length < 8) {
    return { ...initialState, error: "A senha precisa ter pelo menos 8 caracteres." };
  }
  if (!["coach", "athlete", "admin"].includes(role)) {
    return { ...initialState, error: "Papel inválido." };
  }

  const admin = createAdminClient();

  if (role === "athlete") {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "athlete");
    if (count != null && count >= 50) {
      return { ...initialState, error: "Limite de 50 atletas cadastrados atingido." };
    }
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { ...initialState, error: createError?.message ?? "Falha ao criar usuário." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: created.user.id, role, full_name: fullName });

  if (profileError) {
    // Reverte o usuário do Auth pra não deixar login órfão sem perfil.
    await admin.auth.admin.deleteUser(created.user.id);
    const message = profileError.message.includes("Limite de 50 atletas")
      ? "Limite de 50 atletas cadastrados atingido."
      : profileError.message;
    return { ...initialState, error: message };
  }

  revalidatePath("/admin");
  return { error: null, success: `Conta de ${role === "coach" ? "treinador" : role === "admin" ? "administrador" : "aluno"} criada.` };
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
