const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface FeedbackDraftInput {
  athleteName: string;
  workoutTitle: string;
  discipline: string;
  planned: { durationSeconds: number | null; tss: number | null; ifScore: number | null };
  completed: {
    durationSeconds: number | null;
    tss: number | null;
    ifScore: number | null;
    hrAvg: number | null;
    rpe: number | null;
    feeling: number | null;
    athleteComments: string | null;
  };
}

function buildPrompt(input: FeedbackDraftInput): string {
  return [
    "Você é assistente de um treinador de ciclismo/corrida/academia.",
    "Escreva um rascunho curto (máx. 3 frases, em português) de feedback pós-treino para o atleta,",
    "comparando o planejado com o realizado. Tom direto e encorajador, sem jargão técnico excessivo.",
    "O treinador vai revisar e editar antes de enviar — não assine, não se apresente.",
    "",
    `Atleta: ${input.athleteName}`,
    `Treino: ${input.workoutTitle} (${input.discipline})`,
    `Planejado: duração ${input.planned.durationSeconds ?? "—"}s, TSS ${input.planned.tss ?? "—"}, IF ${input.planned.ifScore ?? "—"}`,
    `Concluído: duração ${input.completed.durationSeconds ?? "—"}s, TSS ${input.completed.tss ?? "—"}, IF ${input.completed.ifScore ?? "—"}, FC média ${input.completed.hrAvg ?? "—"}`,
    `RPE do atleta: ${input.completed.rpe ?? "—"}/10, sensação: ${input.completed.feeling ?? "—"}/5`,
    input.completed.athleteComments ? `Comentário do atleta: "${input.completed.athleteComments}"` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Gera um rascunho de feedback pós-treino via Gemini. Retorna texto puro,
 * pronto para o treinador revisar/editar antes de enviar ao atleta — nunca
 * é exibido ao atleta sem revisão humana.
 */
export async function generateFeedbackDraft(input: FeedbackDraftInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(input) }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 200 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao gerar rascunho com Gemini: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Resposta do Gemini sem texto.");
  }

  return text.trim();
}
