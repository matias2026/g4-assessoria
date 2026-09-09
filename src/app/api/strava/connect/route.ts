import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildStravaAuthorizeUrl } from "@/lib/strava/client";

// Inicia o fluxo OAuth do Strava para o atleta autenticado.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const redirectUri = new URL("/api/strava/callback", request.url).toString();
  const authorizeUrl = buildStravaAuthorizeUrl(redirectUri, user.id);

  return NextResponse.redirect(authorizeUrl);
}
