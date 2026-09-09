import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeStravaCode } from "@/lib/strava/client";

// Recebe o retorno do Strava, troca o code por tokens e salva em strava_tokens.
// `state` carrega o profile_id enviado em /api/strava/connect.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const profileId = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError || !code || !profileId) {
    return NextResponse.redirect(new URL("/dashboard?strava=erro", request.url));
  }

  try {
    const tokens = await exchangeStravaCode(code);
    const supabase = createAdminClient();

    const { error } = await supabase.from("strava_tokens").upsert(
      {
        profile_id: profileId,
        strava_athlete_id: tokens.athlete?.id ?? 0,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" }
    );

    if (error) throw error;

    return NextResponse.redirect(new URL("/dashboard?strava=conectado", request.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard?strava=erro", request.url));
  }
}
