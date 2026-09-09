import type { StravaSummaryActivity, StravaTokenResponse } from "./types";

const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";

// Escopo mínimo necessário para ler atividades do atleta.
const SCOPE = "read,activity:read_all";

/**
 * Monta a URL de autorização OAuth do Strava. `state` deve carregar o id do
 * perfil (profile_id) para associar o retorno do callback ao atleta correto.
 */
export function buildStravaAuthorizeUrl(redirectUri: string, state: string) {
  const url = new URL(STRAVA_AUTHORIZE_URL);
  url.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao trocar code do Strava: ${response.status}`);
  }

  return response.json();
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao renovar token do Strava: ${response.status}`);
  }

  return response.json();
}

export async function fetchAthleteActivities(
  accessToken: string,
  { after, perPage = 30 }: { after?: number; perPage?: number } = {}
): Promise<StravaSummaryActivity[]> {
  const url = new URL(`${STRAVA_API_BASE}/athlete/activities`);
  url.searchParams.set("per_page", String(perPage));
  if (after) url.searchParams.set("after", String(after));

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar atividades do Strava: ${response.status}`);
  }

  return response.json();
}
