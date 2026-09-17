import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { exchangeStravaCode } from "@/lib/strava/client";
import { pullStravaActivities } from "@/lib/strava/sync";

// Assim que a conta conecta, já traz um histórico maior (30, mais que as
// 20 do botão manual "Sincronizar agora") — sem isso, o aluno conectava o
// Strava e via a tela vazia até clicar em sincronizar, o que muita gente
// nem sabe que precisa fazer. Nunca depende de o aluno já ter um treino
// prescrito: toda atividade buscada é gravada de qualquer forma (ver
// src/lib/strava/sync.ts).
const CONNECT_INITIAL_SYNC_COUNT = 30;

// Recebe o retorno do Strava e troca o code por tokens. O `state` que o
// Strava ecoa de volta é só um valor que /api/strava/connect gerou e nunca
// foi assinado — não dá pra confiar nele como identidade (alguém que
// descobre/adivinha o profile_id de outra pessoa poderia forjar esse
// redirect e sequestrar a conexão Strava dela). A identidade de verdade
// vem sempre da sessão autenticada de quem está navegando agora, a mesma
// que iniciou o fluxo em /api/strava/connect.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError || !code) {
    return NextResponse.redirect(new URL("/dashboard?strava=erro", request.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const tokens = await exchangeStravaCode(code);
    const admin = createAdminClient();

    const { error } = await admin.from("strava_tokens").upsert(
      {
        profile_id: user.id,
        strava_athlete_id: tokens.athlete?.id ?? 0,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" }
    );

    if (error) throw error;

    // Falha aqui não desfaz a conexão — o token já está salvo e "Sincronizar
    // agora" continua disponível pro aluno tentar de novo manualmente.
    try {
      await pullStravaActivities(admin, user.id, tokens.access_token, CONNECT_INITIAL_SYNC_COUNT);
    } catch (e) {
      console.error("[strava] falha ao sincronizar histórico inicial (conexão salva mesmo assim):", e);
    }

    return NextResponse.redirect(new URL("/dashboard?strava=conectado", request.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard?strava=erro", request.url));
  }
}
