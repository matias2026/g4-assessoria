const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(prompt: string, maxOutputTokens: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens },
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

function buildFeedbackPrompt(input: FeedbackDraftInput): string {
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
  return callGemini(buildFeedbackPrompt(input), 200);
}

export interface PhysiologyReportInput {
  athleteName: string;
  tipoTeste: "ciclismo" | "corrida" | "outro";
  dataAvaliacao: string;
  stages: { estagioNumero: number; intensity: string; lactato: number | null; fc: number | null; glicemia: number | null; pse: number | null }[];
  lt1Intensity: string | null;
  lt1Fc: number | null;
  lt2Intensity: string | null;
  lt2Fc: number | null;
  hrvRmssdRest: number | null;
  observacoes: string | null;
}

function buildPhysiologyReportPrompt(input: PhysiologyReportInput): string {
  const stageLines = input.stages
    .map(
      (s) =>
        `Estágio ${s.estagioNumero}: ${s.intensity}, lactato ${s.lactato ?? "—"} mmol/L, FC ${s.fc ?? "—"} bpm, glicemia ${s.glicemia ?? "—"}, PSE ${s.pse ?? "—"}/10`
    )
    .join("\n");

  return [
    "Você é assistente de um treinador de ciclismo/corrida, com conhecimento de fisiologia do exercício.",
    "Escreva um parecer técnico curto (4-6 frases, em português) sobre esta avaliação de limiar de lactato,",
    "interpretando os limiares encontrados e o que eles sugerem pra prescrição de treino.",
    "Tom técnico mas acessível pro atleta entender. NÃO invente valores que não estão nos dados abaixo.",
    "O treinador vai revisar e editar antes de publicar pro atleta — não assine, não se apresente.",
    "",
    `Atleta: ${input.athleteName}`,
    `Teste: ${input.tipoTeste}, em ${input.dataAvaliacao}`,
    "",
    "Estágios coletados:",
    stageLines,
    "",
    `LT1 (limiar aeróbico): ${input.lt1Intensity ?? "não identificado"}${input.lt1Fc != null ? `, FC ${input.lt1Fc} bpm` : ""}`,
    `LT2 (limiar anaeróbico): ${input.lt2Intensity ?? "não identificado"}${input.lt2Fc != null ? `, FC ${input.lt2Fc} bpm` : ""}`,
    input.hrvRmssdRest != null ? `HRV de repouso (RMSSD): ${input.hrvRmssdRest} ms` : "",
    input.observacoes ? `Observações do treinador: "${input.observacoes}"` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Gera um rascunho de parecer técnico sobre uma avaliação fisiológica via
 * Gemini — mesmo princípio do feedback de treino: sempre um rascunho que o
 * treinador revisa/edita antes de publicar pro atleta (ver
 * avaliacoes_fisiologicas.published), nunca chega no aluno sem revisão.
 */
export async function generatePhysiologyReportDraft(input: PhysiologyReportInput): Promise<string> {
  return callGemini(buildPhysiologyReportPrompt(input), 350);
}
