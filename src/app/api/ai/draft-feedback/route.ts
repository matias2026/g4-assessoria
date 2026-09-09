import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFeedbackDraft, type FeedbackDraftInput } from "@/lib/ai/gemini";

// Gera um rascunho de feedback pós-treino com IA (Gemini) para o treinador
// revisar/editar antes de enviar ao atleta. Requer treinador autenticado.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const input = (await request.json()) as FeedbackDraftInput;
    const draft = await generateFeedbackDraft(input);
    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar rascunho.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
