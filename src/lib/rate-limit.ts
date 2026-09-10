import { createAdminClient } from "@/lib/supabase/admin";

// Rate limit por IP usando o próprio Postgres do Supabase (função
// check_rate_limit, ver supabase/migrations/0006_rate_limit_via_postgres.sql)
// — nenhum serviço externo novo, roda no mesmo banco que o app já usa. Um
// Map em memória não serve porque a Vercel roda cada requisição numa
// instância serverless separada; o banco é o único estado compartilhado.
type LimiterName = "login" | "api";

const WINDOWS: Record<LimiterName, { windowSeconds: number; max: number }> = {
  // Login: 5 tentativas a cada 5 minutos por IP — protege contra força
  // bruta sem travar alguém que errou a senha uma ou duas vezes.
  login: { windowSeconds: 300, max: 5 },
  // Demais rotas de API (ex.: geração de feedback com IA): 30 req/min por IP.
  api: { windowSeconds: 60, max: 30 },
};

export interface RateLimitResult {
  success: boolean;
}

export async function checkRateLimit(name: LimiterName, identifier: string): Promise<RateLimitResult> {
  const { windowSeconds, max } = WINDOWS[name];
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: `${name}:${identifier}`,
    p_window_seconds: windowSeconds,
    p_max: max,
  });

  if (error) {
    // Se o banco estiver fora do ar, não é motivo pra derrubar login/API —
    // loga e deixa passar (falha aberta), a checagem de auth continua valendo.
    console.error("[rate-limit] falha ao checar limite, permitindo por padrão:", error.message);
    return { success: true };
  }

  return { success: data === true };
}

// Extrai o IP real do cliente a partir dos headers que a Vercel injeta
// (x-forwarded-for pode trazer uma lista "cliente, proxy1, proxy2" — o
// primeiro item é o cliente original).
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
