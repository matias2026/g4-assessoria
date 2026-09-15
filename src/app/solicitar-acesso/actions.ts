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
  // Trim pra não deixar espaço invisível virar a diferença entre a senha
  // que a pessoa acha que definiu e a que fica salva — mesmo cuidado do
  // login (src/app/login/actions.ts).
  const password = String(formData.get("password") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const roleRequested = String(formData.get("role_requested") ?? "") as AccessRequestRole;
  const birthDateRaw = String(formData.get("birth_date") ?? "").trim();
  const weightRaw = String(formData.get("weight_kg") ?? "").trim();
  const heightRaw = String(formData.get("height_cm") ?? "").trim();
  const medicalNotes = String(formData.get("medical_notes") ?? "").trim();
  const modalidade = String(formData.get("modalidade") ?? "").trim();
  const trainingExperienceRaw = String(formData.get("training_experience") ?? "").trim();
  const recaptchaToken = String(formData.get("g-recaptcha-response") ?? "");

  if (!fullName || !email) {
    return { ...initialState, error: "Preencha nome e e-mail." };
  }
  if (password.length < 8) {
    return { ...initialState, error: "A senha precisa ter pelo menos 8 caracteres." };
  }
  if (!["athlete", "coach"].includes(roleRequested)) {
    return { ...initialState, error: "Selecione se você é aluno ou treinador." };
  }

  // Data de nascimento só faz sentido pra aluno (vira a idade da ficha na
  // aprovação) — validada e nunca no futuro, mas é opcional: quem não
  // preencher não é bloqueado, o treinador completa depois.
  let birthDate: string | null = null;
  if (roleRequested === "athlete" && birthDateRaw) {
    const parsed = new Date(birthDateRaw);
    if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
      return { ...initialState, error: "Data de nascimento inválida." };
    }
    birthDate = birthDateRaw;
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
    password,
    phone: phone || null,
    role_requested: roleRequested,
    message: message || null,
    birth_date: birthDate,
    weight_kg: roleRequested === "athlete" && weightRaw ? Number(weightRaw) : null,
    height_cm: roleRequested === "athlete" && heightRaw ? Number(heightRaw) : null,
    medical_notes: roleRequested === "athlete" ? medicalNotes || null : null,
    modalidade: roleRequested === "athlete" ? modalidade || null : null,
    training_experience:
      roleRequested === "athlete" && (trainingExperienceRaw === "iniciante" || trainingExperienceRaw === "experiente")
        ? trainingExperienceRaw
        : null,
  });

  if (error) {
    return { ...initialState, error: "Falha ao enviar o pedido. Tente novamente." };
  }

  return { error: null, success: true };
}
