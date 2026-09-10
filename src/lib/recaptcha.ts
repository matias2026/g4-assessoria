// Verificação server-side do reCAPTCHA v2 (Google) — o token do widget
// client-side não prova nada sozinho, só o siteverify confirma que é real.
// Sem RECAPTCHA_SECRET_KEY configurada, deixa passar com um aviso no log
// (mesmo padrão do rate limit: não quebra o app antes da chave existir).
export async function verifyRecaptcha(token: string, remoteIp: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    console.warn("[recaptcha] RECAPTCHA_SECRET_KEY não configurada — verificação DESATIVADA.");
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
