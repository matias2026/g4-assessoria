"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";
import type { AccessRequestRole } from "@/lib/supabase/types";

export interface RequestAccessState {
  error: string | null;
  success: boolean;
}

const initialState: RequestAccessState = { error: null, success: false };

// Único ponto de entrada público do site (sem login). Insere sempre com a
// service role — não existe policy de insert pra anon em access_requests,
// então mesmo alguém chamando a API do Supabase direto não consegue burlar
// o rate limit/reCAPTCHA daqui.
export async function submitAccessRequest(
  _prevState: RequestAccessState,
  formData: FormData
): Promise<RequestAccessState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const roleRequested = String(formData.get("role_requested") ?? "") as AccessRequestRole;
  const recaptchaToken = String(formData.get("g-recaptcha-response") ?? "");

  if (!fullName || !email) {
    return { ...initialState, error: "Preencha nome e e-mail." };
  }
  if (!["athlete", "coach"].includes(roleRequested)) {
    return { ...initialState, error: "Selecione se você é aluno ou treinador." };
  }

  const ip = getClientIp(await headers());

  const { success: withinLimit } = await checkRateLimit("access_request", ip);
  if (!withinLimit) {
    return { ...initialState, error: "Muitos pedidos enviados. Tente novamente mais tarde." };
  }

  const recaptchaOk = await verifyRecaptcha(recaptchaToken, ip);
  if (!recaptchaOk) {
    return { ...initialState, error: "Verificação de segurança falhou. Marque o reCAPTCHA e tente de novo." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("access_requests").insert({
    full_name: fullName,
    email,
    phone: phone || null,
    role_requested: roleRequested,
    message: message || null,
  });

  if (error) {
    return { ...initialState, error: "Falha ao enviar o pedido. Tente novamente." };
  }

  return { error: null, success: true };
}
