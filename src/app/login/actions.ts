"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homePathForRole } from "@/lib/supabase/roles";
import type { ProfileRole } from "@/lib/supabase/types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export interface LoginState {
  error: string | null;
}

// Login de treinador/atleta. Não existe autocadastro — a conta só existe se
// o painel /admin criou. Roda no servidor (Server Action) para que o rate
// limit por IP seja real, e não algo que um client malicioso pode ignorar.
export async function signIn(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const expectedRole = String(formData.get("expected_role") ?? "");

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  const ip = getClientIp(await headers());
  const { success } = await checkRateLimit("login", ip);
  if (!success) {
    return { error: "Muitas tentativas de login. Aguarde alguns minutos e tente de novo." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "E-mail ou senha inválidos." };
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .single();
  // O generic da tabela via @supabase/ssr não propaga o tipo da coluna aqui;
  // o shape é conhecido (profiles.role/active) então a asserção é segura.
  const profile = profileData as { role: ProfileRole; active: boolean } | null;

  if (!profile || profile.role === "admin") {
    await supabase.auth.signOut();
    return { error: "Esta conta não tem acesso por aqui. Administradores usam /admin/login." };
  }

  if (!profile.active) {
    await supabase.auth.signOut();
    return { error: "Esta conta está suspensa. Fale com seu treinador." };
  }

  if (expectedRole && profile.role !== expectedRole) {
    await supabase.auth.signOut();
    const correct = profile.role === "coach" ? "treinador" : "aluno";
    return { error: `Essa conta é de ${correct}. Selecione a opção "Sou ${correct}" acima.` };
  }

  redirect(next && next.startsWith("/") ? next : homePathForRole(profile.role));
}
