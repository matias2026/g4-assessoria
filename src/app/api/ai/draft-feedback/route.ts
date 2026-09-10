import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { generateFeedbackDraft, type FeedbackDraftInput } from "@/lib/ai/gemini";
import type { ProfileRole } from "@/lib/supabase/types";

// Gera um rascunho de feedback pós-treino com IA (Gemini) para o treinador
// revisar/editar antes de enviar ao atleta. Requer treinador autenticado.
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const { success } = await checkRateLimit("api", ip);
    if (!success) {
      return NextResponse.json({ error: "Muitas requisições. Tente novamente em instantes." }, { status: 429 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    // O generic da tabela via @supabase/ssr não propaga o tipo da coluna aqui;
    // o shape é conhecido (profiles.role: ProfileRole) então a asserção é segura.
    const profile = data as { role: ProfileRole } | null;

    if (profile?.role !== "coach" && profile?.role !== "admin") {
      return NextResponse.json({ error: "Acesso restrito a treinadores." }, { status: 403 });
    }

    const input = (await request.json()) as FeedbackDraftInput;
    const draft = await generateFeedbackDraft(input);
    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar rascunho.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
