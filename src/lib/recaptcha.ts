// Verificação server-side do reCAPTCHA v2 (Google) — o token do widget
// client-side não prova nada sozinho, só o siteverify confirma que é real.
// Sem RECAPTCHA_SECRET_KEY configurada: em produção recusa (falha fechada —
// uma chave esquecida no deploy não pode desligar a proteção contra bot
// silenciosamente); só em dev deixa passar com um aviso, pra não travar
// quem está rodando local sem configurar a chave.
export async function verifyRecaptcha(token: string, remoteIp: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[recaptcha] RECAPTCHA_SECRET_KEY não configurada em produção — recusando por segurança.");
      return false;
    }
    console.warn("[recaptcha] RECAPTCHA_SECRET_KEY não configurada — verificação DESATIVADA (dev).");
    return true;
  }

  if (!token) return false;

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: remoteIp }),
    });
    const data = (await response.json()) as { success: boolean };
    return data.success === true;
  } catch (error) {
    console.error("[recaptcha] falha ao verificar, recusando por segurança:", error);
    return false;
  }
}
