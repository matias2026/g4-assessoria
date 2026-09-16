"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";

export interface CreateOrganizationState {
  error: string | null;
  success: boolean;
  // Preenchido só no sucesso — usado pra mostrar o link de cadastro
  // (/login?org=<slug>) que o admin recém-criado vai repassar pro time dele.
  orgSlug: string | null;
}

const initialState: CreateOrganizationState = { error: null, success: false, orgSlug: null };

// Mesmo mapa de códigos estáveis do Supabase Auth usado em
// src/app/admin/actions.ts e cockpit/students-actions.ts.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  email_exists: "Já existe uma conta cadastrada com esse e-mail.",
  weak_password: "Senha muito fraca — use pelo menos 8 caracteres.",
  email_address_invalid: "E-mail inválido.",
  validation_failed: "Dados inválidos — confira o e-mail e a senha.",
};

function translateAuthError(error: { code?: string; message: string }): string {
  if (error.code && AUTH_ERROR_MESSAGES[error.code]) return AUTH_ERROR_MESSAGES[error.code];
  console.error("[criar-assessoria] erro do Supabase Auth não mapeado:", error.code, error.message);
  return "Não foi possível criar a conta. Tente novamente.";
}

function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "assessoria";
}

/**
 * Cadastro público de uma assessoria nova — cria a organização (tenant),
 * a assinatura em trial e o primeiro admin dela de uma vez. Único ponto de
 * entrada pra uma organização além da G4 existir no sistema: sem isso,
 * /solicitar-acesso não tinha pra qual organização nova cair, e um
 * segundo cliente não tinha como usar o sistema.
 */
export async function createOrganization(
  _prevState: CreateOrganizationState,
  formData: FormData
): Promise<CreateOrganizationState> {
  const organizationName = String(formData.get("organization_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  // Trim na senha — mesmo cuidado do resto do app (login, pedido de
  // acesso): um espaço colado sem querer não pode virar "dados inválidos"
  // sem nenhuma pista visível.
  const password = String(formData.get("password") ?? "").trim();
  const recaptchaToken = String(formData.get("g-recaptcha-response") ?? "");

  if (!organizationName || !fullName || !email) {
    return { ...initialState, error: "Preencha o nome da assessoria, seu nome e seu e-mail." };
  }
  if (password.length < 8) {
    return { ...initialState, error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const ip = getClientIp(await headers());

  const { success: withinLimit } = await checkRateLimit("create_organization", ip);
  if (!withinLimit) {
    return { ...initialState, error: "Muitos pedidos enviados. Tente novamente mais tarde." };
  }

  const recaptchaOk = await verifyRecaptcha(recaptchaToken, ip);
  if (!recaptchaOk) {
    return { ...initialState, error: "Verificação de segurança falhou. Marque o reCAPTCHA e tente de novo." };
  }

  const admin = createAdminClient();

  // Gera um slug único a partir do nome — tenta o nome puro primeiro, só
  // acrescenta sufixo aleatório se já existir outra organização com o
  // mesmo slug (nomes parecidos, ex. duas academias "Vida Ativa").
  const baseSlug = slugify(organizationName);
  let slug = baseSlug;
  for (let attempt = 0; attempt < 20; attempt++) {
    const { data: existing } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: organizationName, slug })
    .select("id, slug")
    .single();

  if (orgError || !org) {
    console.error("[criar-assessoria] erro do Postgres ao criar organização:", orgError?.message);
    return { ...initialState, error: "Não foi possível criar a assessoria agora. Tente novamente." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    // Reverte a organização recém-criada — sem admin, ela ficaria órfã e
    // travando o slug pra sempre.
    await admin.from("organizations").delete().eq("id", org.id);
    return { ...initialState, error: createError ? translateAuthError(createError) : "Falha ao criar usuário." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: created.user.id, role: "admin", full_name: fullName, organization_id: org.id });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from("organizations").delete().eq("id", org.id);
    console.error("[criar-assessoria] erro do Postgres ao criar perfil do admin:", profileError.message);
    return { ...initialState, error: "Não foi possível criar a conta. Tente novamente." };
  }

  // Assinatura nasce em trial — não existe gateway de pagamento conectado
  // (ver README, seção "Assinaturas e pagamento"); isso só registra que a
  // organização existe e está usando o sistema. Falha aqui não desfaz a
  // conta: organização e admin já funcionam, só loga pra criar a
  // assinatura manualmente depois.
  const { error: subscriptionError } = await admin
    .from("subscriptions")
    .insert({ organization_id: org.id, status: "trialing" });

  if (subscriptionError) {
    console.error("[criar-assessoria] erro ao criar assinatura inicial:", subscriptionError.message);
  }

  return { error: null, success: true, orgSlug: org.slug };
}
