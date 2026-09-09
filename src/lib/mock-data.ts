// Dados de exemplo usados apenas para visualizar as telas antes da integração
// real com Supabase/Strava. Substitua pelas consultas em src/lib/supabase
// assim que o projeto Supabase estiver provisionado.

import type { WorkoutCompletionSource, WorkoutInterval, WorkoutStatus } from "./supabase/types";
import type { ZoneDatum } from "@/components/workout/ZonesChart";

export interface MockWorkoutOfDay {
  title: string;
  discipline: string;
  description: string;
  status: WorkoutStatus;
}

export const mockWorkoutOfDay: MockWorkoutOfDay = {
  title: "Intervalado de limiar",
  discipline: "Ciclismo",
  description: "6x5min a 90% FTP, recuperação de 3min entre séries.",
  status: "pending",
};

// Treino exibido na tela de detalhes (Planejado vs. Concluído), no padrão
// TrainingPeaks. Um registro por aluno em mockWorkoutDetails, com o mesmo id
// do aluno em mockStudents, até o treino real ser resolvido via Supabase.
export interface MockWorkoutDetail {
  id: string;
  athleteName: string;
  athletePhone: string;
  coachName: string;
  coachPhone: string;
  title: string;
  discipline: string;
  scheduledDateLabel: string;
  status: WorkoutStatus;
  description: string;
  prescription: {
    warmup: string;
    mainSet: string;
    cooldown: string;
    videoUrl: string | null;
  };
  structuredIntervals: WorkoutInterval[];
  powerZones: ZoneDatum[];
  planned: {
    durationSeconds: number | null;
    distanceMeters: number | null;
    tss: number | null;
    ifScore: number | null;
    hrMin: number | null;
    hrAvg: number | null;
    hrMax: number | null;
  };
  completed: {
    source: WorkoutCompletionSource;
    durationSeconds: number | null;
    distanceMeters: number | null;
    tss: number | null;
    ifScore: number | null;
    hrMin: number | null;
    hrAvg: number | null;
    hrMax: number | null;
    rpe: number | null;
    feeling: number | null;
    comments: string | null;
    aiFeedbackDraft: string | null;
    coachFeedback: string | null;
  } | null;
}

export const DEMO_WORKOUT_ID = "1";

// Um modelo de treino por modalidade — usado para gerar os 15 registros de
// mockWorkoutDetails abaixo (cada aluno com sua própria prescrição editável).
interface WorkoutTemplate {
  title: string;
  discipline: string;
  description: string;
  prescription: MockWorkoutDetail["prescription"];
  structuredIntervals: WorkoutInterval[];
  powerZones: ZoneDatum[];
  planned: MockWorkoutDetail["planned"];
  completedTemplate: NonNullable<MockWorkoutDetail["completed"]>;
}

const TEMPLATE_CICLISMO: WorkoutTemplate = {
  title: "Intervalado de limiar",
  discipline: "Ciclismo",
  description: "Sessão de limiar para elevar o FTP, mantendo potência estável em cada tiro.",
  prescription: {
    warmup: "15min progressivo em Z1-Z2, com 3 acelerações de 20s no final.",
    mainSet: "6x5min a 90% FTP (Z4), recuperação de 3min em Z1 entre as séries.",
    cooldown: "10min soltando em Z1, cadência livre.",
    videoUrl: "https://www.youtube.com/watch?v=exemplo-preleção",
  },
  structuredIntervals: [
    { type: "warmup", durationSeconds: 15 * 60, targetLowPct: 50, targetHighPct: 70 },
    { type: "interval", durationSeconds: 5 * 60, targetLowPct: 90, targetHighPct: 90 },
    { type: "recovery", durationSeconds: 3 * 60, targetLowPct: 45, targetHighPct: 45 },
    { type: "interval", durationSeconds: 5 * 60, targetLowPct: 90, targetHighPct: 90 },
    { type: "recovery", durationSeconds: 3 * 60, targetLowPct: 45, targetHighPct: 45 },
    { type: "interval", durationSeconds: 5 * 60, targetLowPct: 90, targetHighPct: 90 },
    { type: "recovery", durationSeconds: 3 * 60, targetLowPct: 45, targetHighPct: 45 },
    { type: "interval", durationSeconds: 5 * 60, targetLowPct: 90, targetHighPct: 90 },
    { type: "recovery", durationSeconds: 3 * 60, targetLowPct: 45, targetHighPct: 45 },
    { type: "interval", durationSeconds: 5 * 60, targetLowPct: 90, targetHighPct: 90 },
    { type: "recovery", durationSeconds: 3 * 60, targetLowPct: 45, targetHighPct: 45 },
    { type: "interval", durationSeconds: 5 * 60, targetLowPct: 90, targetHighPct: 90 },
    { type: "cooldown", durationSeconds: 10 * 60, targetLowPct: 40, targetHighPct: 50 },
  ],
  powerZones: [
    { zone: "Z1", label: "Recuperação", plannedMinutes: 25, completedMinutes: 20 },
    { zone: "Z2", label: "Resistência", plannedMinutes: 10, completedMinutes: 10 },
    { zone: "Z3", label: "Ritmo", plannedMinutes: 5, completedMinutes: 6 },
    { zone: "Z4", label: "Limiar", plannedMinutes: 30, completedMinutes: 34 },
    { zone: "Z5", label: "VO2max", plannedMinutes: 0, completedMinutes: 4 },
  ],
  planned: {
    durationSeconds: 70 * 60,
    distanceMeters: 32000,
    tss: 78,
    ifScore: 0.85,
    hrMin: 110,
    hrAvg: 148,
    hrMax: 168,
  },
  completedTemplate: {
    source: "strava",
    durationSeconds: 74 * 60 + 20,
    distanceMeters: 33450,
    tss: 82,
    ifScore: 0.87,
    hrMin: 104,
    hrAvg: 151,
    hrMax: 172,
    rpe: 7,
    feeling: 4,
    comments: "Últimas duas séries pesaram mais, mas consegui segurar a potência alvo.",
    aiFeedbackDraft:
      "Rascunho (IA): o atleta superou o TSS planejado (+4) e o IF (+0.02) mantendo a FC média estável, sinal de boa adaptação ao limiar. RPE 7 e sensação boa sugerem espaço para progressão na próxima semana.",
    coachFeedback:
      "Excelente sessão! Você segurou a potência mesmo com a fadiga das últimas séries — é exatamente esse tipo de resposta que buscamos. Próxima semana subimos 1 série.",
  },
};

const TEMPLATE_CORRIDA: WorkoutTemplate = {
  title: "Rodagem longa com progressão",
  discipline: "Corrida",
  description: "Trabalho de resistência aeróbica, fechando em ritmo de prova de 10km.",
  prescription: {
    warmup: "10min trote leve + mobilidade articular e 4 tiros de 15s.",
    mainSet: "50min em ritmo confortável (Z2); nos últimos 10min, progressão até o ritmo de 10km.",
    cooldown: "5min caminhada + alongamento leve.",
    videoUrl: null,
  },
  structuredIntervals: [],
  powerZones: [],
  planned: {
    durationSeconds: 65 * 60,
    distanceMeters: 12000,
    tss: 62,
    ifScore: 0.78,
    hrMin: 118,
    hrAvg: 152,
    hrMax: 171,
  },
  completedTemplate: {
    source: "manual",
    durationSeconds: 63 * 60,
    distanceMeters: 12400,
    tss: 65,
    ifScore: 0.8,
    hrMin: 115,
    hrAvg: 150,
    hrMax: 169,
    rpe: 6,
    feeling: 5,
    comments: "Me senti leve o treino inteiro, a progressão saiu tranquila.",
    aiFeedbackDraft:
      "Rascunho (IA): ritmo final acima do previsto com FC estável — bom sinal de forma. RPE baixo sugere espaço para aumentar o volume na próxima semana.",
    coachFeedback:
      "Muito bom! Ritmo final ótimo sem custo extra de FC. Semana que vem aumentamos 10min na parte principal.",
  },
};

const TEMPLATE_ACADEMIA: WorkoutTemplate = {
  title: "Treino de força — membros inferiores",
  discipline: "Academia",
  description: "Foco em força máxima e potência de pernas, para transferir para o pedal/corrida.",
  prescription: {
    warmup: "10min bike leve + ativação de glúteos e core.",
    mainSet: "Agachamento 4x6, levantamento terra romeno 3x8, leg press 3x10, panturrilha 3x15.",
    cooldown: "5min de alongamento geral.",
    videoUrl: null,
  },
  structuredIntervals: [],
  powerZones: [],
  planned: {
    durationSeconds: 60 * 60,
    distanceMeters: null,
    tss: null,
    ifScore: null,
    hrMin: null,
    hrAvg: null,
    hrMax: null,
  },
  completedTemplate: {
    source: "manual",
    durationSeconds: 55 * 60,
    distanceMeters: null,
    tss: null,
    ifScore: null,
    hrMin: null,
    hrAvg: null,
    hrMax: null,
    rpe: 8,
    feeling: 3,
    comments: "Pesado hoje, mas fechei todas as séries.",
    aiFeedbackDraft:
      "Rascunho (IA): RPE alto (8) com sensação neutra pode indicar fadiga acumulada — vale checar o volume da semana.",
    coachFeedback:
      "Ótimo trabalho fechando as séries mesmo pesado. Vamos aliviar a carga na próxima sessão de perna.",
  },
};

const TEMPLATES = [TEMPLATE_CICLISMO, TEMPLATE_CORRIDA, TEMPLATE_ACADEMIA];
const TODAY_STATUSES: WorkoutStatus[] = ["done", "pending", "missed"];

// Nomes reais dos 15 alunos da G4 — evita a sensação de dados genéricos
// ("Atleta 1", "Atleta 2") em uma tela que deve parecer um cockpit de
// produção, não um placeholder.
const STUDENT_NAMES = [
  "Carlos Silva",
  "Mariana Souza",
  "Bruno Lima",
  "Fernanda Costa",
  "Rafael Oliveira",
  "Juliana Santos",
  "Diego Almeida",
  "Camila Ferreira",
  "Thiago Rodrigues",
  "Patrícia Gomes",
  "Lucas Martins",
  "Beatriz Carvalho",
  "Eduardo Barbosa",
  "Larissa Ribeiro",
  "Gustavo Pereira",
];

function lastActivityName(discipline: string): string {
  if (discipline === "Ciclismo") return "Pedal matinal";
  if (discipline === "Corrida") return "Corrida matinal";
  return "Treino de força";
}

export interface MockStudent {
  id: string;
  name: string;
  discipline: string;
  todayStatus: WorkoutStatus;
  stravaSynced: boolean;
  lastActivity: { name: string; distanceKm: number; date: string } | null;
}

export const mockStudents: MockStudent[] = Array.from({ length: 15 }, (_, i) => {
  const template = TEMPLATES[i % TEMPLATES.length];
  // Ciclismo/Corrida sincronizam via Strava; Academia não tem GPS, então
  // fica sempre fora do Strava, refletindo a integração real.
  const stravaSynced = template.discipline !== "Academia" && i % 4 !== 3;

  return {
    id: String(i + 1),
    name: STUDENT_NAMES[i],
    discipline: template.discipline,
    todayStatus: TODAY_STATUSES[i % TODAY_STATUSES.length],
    stravaSynced,
    lastActivity: stravaSynced
      ? { name: lastActivityName(template.discipline), distanceKm: 20 + i * 3, date: "hoje" }
      : null,
  };
});

export const mockWorkoutDetails: Record<string, MockWorkoutDetail> = Object.fromEntries(
  mockStudents.map((student, i) => {
    const template = TEMPLATES[i % TEMPLATES.length];

    const detail: MockWorkoutDetail = {
      id: student.id,
      athleteName: student.name,
      athletePhone: `+5584${999990000 + i + 1}`,
      coachName: "Treinador G4",
      coachPhone: "+5584999990000",
      title: template.title,
      discipline: template.discipline,
      scheduledDateLabel: "Hoje · 09/09",
      status: student.todayStatus,
      description: template.description,
      prescription: template.prescription,
      structuredIntervals: template.structuredIntervals,
      powerZones: template.powerZones,
      planned: template.planned,
      completed: student.todayStatus === "done" ? { ...template.completedTemplate } : null,
    };

    return [student.id, detail];
  })
);

export const mockWeeklyHistory: { day: string; status: WorkoutStatus }[] = [
  { day: "Seg", status: "done" },
  { day: "Ter", status: "done" },
  { day: "Qua", status: "missed" },
  { day: "Qui", status: "done" },
  { day: "Sex", status: "pending" },
  { day: "Sáb", status: "pending" },
  { day: "Dom", status: "pending" },
];
