import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limit por IP usando Upstash Redis (compartilhado entre as execuções
// serverless da Vercel — um Map em memória não funciona porque cada
// invocação pode cair numa instância diferente). Sem as credenciais
// configuradas o app não quebra: cai para "sempre permite" com um aviso no
// log, então o deploy funciona antes do Upstash ser configurado.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

if (!redis && process.env.NODE_ENV !== "test") {
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN não configurados — " +
      "rate limiting está DESATIVADO (todas as requisições são permitidas)."
  );
}

type LimiterName = "login" | "api";

const limiters: Record<LimiterName, Ratelimit | null> = {
  // Login: 5 tentativas a cada 5 minutos por IP — protege contra força bruta
  // sem travar um usuário legítimo que errou a senha uma ou duas vezes.
  login: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "5 m"),
        prefix: "g4:ratelimit:login",
        analytics: true,
      })
    : null,
  // Demais rotas de API (ex.: geração de feedback com IA): 30 req/min por IP.
  api: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        prefix: "g4:ratelimit:api",
        analytics: true,
      })
    : null,
};

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
}

export async function checkRateLimit(name: LimiterName, identifier: string): Promise<RateLimitResult> {
  const limiter = limiters[name];
  if (!limiter) {
    return { success: true, limit: 0, remaining: 0 };
  }
  const { success, limit, remaining } = await limiter.limit(identifier);
  return { success, limit, remaining };
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
