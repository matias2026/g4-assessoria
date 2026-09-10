"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { LoginState } from "@/app/login/actions";
import type { ProfileRole } from "@/lib/supabase/types";

// Login separado do admin (decisão explícita: conta própria, não uma chave
// secreta compartilhada). Mesmo rate limit por IP do login normal.
export async function signInAdmin(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

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

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Esta conta não é de administrador." };
  }

  if (!profile.active) {
    await supabase.auth.signOut();
    return { error: "Esta conta de administrador está suspensa." };
  }

  redirect("/admin");
}
