import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, ProfileRole } from "@/lib/supabase/types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Site fechado: só treinador, atleta e admin com login cadastrado entram.
// Sem cadastro público — contas só existem se o painel /admin criar. Este
// middleware roda antes de qualquer página protegida (Edge Runtime), então é
// a barreira real — os checks dentro das páginas são defesa em profundidade,
// não a linha de frente.
const PROTECTED_PREFIXES: { prefix: string; roles: ProfileRole[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/cockpit", roles: ["coach", "admin"] },
  { prefix: "/dashboard", roles: ["athlete", "admin"] },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit por IP nas rotas de API — protege contra abuso/força bruta
  // mesmo antes de saber se a requisição está autenticada.
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(request.headers);
    const { success } = await checkRateLimit("api", ip);
    if (!success) {
      return NextResponse.json({ error: "Muitas requisições. Tente novamente em instantes." }, { status: 429 });
    }
  }

  const match = PROTECTED_PREFIXES.find((entry) => pathname.startsWith(entry.prefix));
  if (!match) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const { data } = await supabase.from("profiles").select("role, active").eq("id", user.id).single();
  // Mesma ressalva do resto do código: o generic da tabela via @supabase/ssr
  // não propaga aqui, então a asserção é segura dado o shape conhecido.
  const profile = data as { role: ProfileRole; active: boolean } | null;

  if (!profile || !profile.active || !match.roles.includes(profile.role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(url);

    // Conta suspensa (ou sem perfil válido) com uma sessão ainda ativa —
    // desloga de verdade aqui, não só redireciona. Sem isso, a suspensão só
    // pegava no próximo login (a checagem em login/actions.ts), nunca numa
    // sessão que já estava aberta antes do treinador suspender a conta.
    // signOut() escreve os cookies zerados no `response` do closure (via
    // setAll acima) — copia pro response de redirect que é o que sai daqui,
    // senão a sessão "deslogada" nunca chega no navegador.
    if (profile && !profile.active) {
      await supabase.auth.signOut();
      response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    }

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/cockpit/:path*", "/dashboard/:path*", "/api/:path*"],
};
