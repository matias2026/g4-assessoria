// Dados de exemplo usados apenas para visualizar as telas antes da integração
// real com Supabase/Strava. Substitua pelas consultas em src/lib/supabase
// assim que o projeto Supabase estiver provisionado.
//
// O Cockpit do treinador roda com um único aluno de exemplo (Carlos Silva) —
// suficiente para validar todas as abas (cadastro, prescrição, acompanhamento
// e análise) sem o ruído de uma lista fictícia grande. Novos alunos
// cadastrados pela aba "Alunos cadastrados" entram em memória (useState),
// até a persistência real via Supabase.

import type { WorkoutCompletionSource, WorkoutInterval, WorkoutStatus } from "./supabase/types";
import type { ZoneDatum } from "@/components/workout/ZonesChart";

// Treino exibido na aba "Analisar treino do aluno" (Planejado vs. Concluído),
// no padrão TrainingPeaks. Um registro por aluno em mockWorkoutDetails, com
// o mesmo id do aluno em mockStudents, até o treino real ser resolvido via
// Supabase.
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

// Um modelo de treino por modalidade — usado como ponto de partida na aba
// "Criar/Prescrever treino" quando o treinador escolhe a modalidade.
export interface WorkoutTemplate {
  title: string;
  discipline: string;
  description: string;
  prescription: MockWorkoutDetail["prescription"];
  structuredIntervals: WorkoutInterval[];
  powerZones: ZoneDatum[];
  planned: MockWorkoutDetail["planned"];
  completedTemplate: NonNullable<MockWorkoutDetail["completed"]>;
}

export const TEMPLATE_CICLISMO: WorkoutTemplate = {
  title: "Intervalado de limiar",
  discipline: "Ciclismo",
  description: "Sessão de limiar para elevar o FTP, mantendo potência estável em cada tiro.",
  prescription: {
    warmup: "15min progressivo em Z1-Z2, com 3 acelerações de 20s no final.",
    mainSet: "6x5min a 90% FTP (Z4), recuperação de 3min em Z1 entre as séries.",
    cooldown: "10min soltando em Z1, cadência livre.",
    videoUrl: "https://www.youtube.com/watch?v=exemplo-preleção",
  },
  // Um representante de cada bloco (aquecimento/tiro/recuperação/
  // desaquecimento) — a repetição "6x5min" já está descrita em texto livre
  // no mainSet acima; a lista estruturada não precisa duplicar a série
  // inteira linha a linha.
  structuredIntervals: [
    { type: "warmup", durationSeconds: 15 * 60, targetLowPct: 50, targetHighPct: 70 },
    { type: "interval", durationSeconds: 5 * 60, targetLowPct: 90, targetHighPct: 90 },
    { type: "recovery", durationSeconds: 3 * 60, targetLowPct: 45, targetHighPct: 45 },
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

export const TEMPLATE_CORRIDA: WorkoutTemplate = {
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

export const TEMPLATE_ACADEMIA: WorkoutTemplate = {
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

export const TEMPLATES: WorkoutTemplate[] = [TEMPLATE_CICLISMO, TEMPLATE_CORRIDA, TEMPLATE_ACADEMIA];

export function templateForDiscipline(discipline: string): WorkoutTemplate {
  return TEMPLATES.find((t) => t.discipline === discipline) ?? TEMPLATE_CICLISMO;
}

// Ponto de partida de um treino novo: um único bloco limpo — o treinador
// adiciona os demais manualmente ("+ Adicionar bloco"), em vez de a tela já
// nascer poluída com uma série inteira gerada automaticamente.
const DEFAULT_INTERVAL: WorkoutInterval = {
  type: "warmup",
  durationSeconds: 10 * 60,
  targetLowPct: 50,
  targetHighPct: 70,
};

export function defaultIntervalsForDiscipline(discipline: string): WorkoutInterval[] {
  return discipline === "Ciclismo" ? [{ ...DEFAULT_INTERVAL }] : [];
}

// Sexo do aluno (dado corporal geral, usado só como referência do treinador).
export type StudentSex = "Masculino" | "Feminino" | "Outro";

// Objetivo principal do aluno na Academia/Força.
export type StrengthGoal = "Hipertrofia" | "Emagrecimento" | "Fortalecimento para endurance";

// Composição corporal — opcional, complementa peso/altura.
export interface BodyComposition {
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  waistCm: number | null;
}

// Perfil físico específico de ciclismo — só preenchido quando o aluno
// pratica a modalidade (principal ou adicional). FTP mora aqui (não mais
// solto em MockStudent) porque é um dado de ciclismo, não um dado geral.
export interface CyclingProfile {
  ftpWatts: number | null;
  hrMax: number | null;
  hrRest: number | null;
  hrThreshold: number | null;
  preferredCadence: number | null;
  peakPowerShort: number | null; // pico curto (sprint), watts
  peakPowerLong: number | null; // pico longo (~20min), watts
  mtbNotes: string; // histórico de MTB (altimetria, TSS, IF) — texto livre
}

// Perfil físico específico de corrida.
export interface RunningProfile {
  thresholdPace: string; // "4:15" (min/km) — texto livre, sem cálculo
  vo2max: number | null;
  hrMax: number | null;
  hrThreshold: number | null;
  pr5k: string;
  pr10k: string;
  prHalfMarathon: string;
  cadence: number | null; // passos/min
  strideLengthCm: number | null;
  verticalOscillationCm: number | null;
}

// Perfil físico específico de academia/força.
export interface StrengthProfile {
  goal: StrengthGoal | null;
  squat1RM: number | null;
  deadlift1RM: number | null;
  benchPress1RM: number | null;
  legPress1RM: number | null;
  focusNotes: string; // foco dos treinos
  asymmetryNotes: string; // assimetrias musculares relatadas
}

// Aluno cadastrado no Cockpit. `discipline` é a modalidade principal (dirige
// o treino do dia e o resto do app, como sempre); `secondaryDisciplines`
// cobre casos de dupla modalidade (ex.: Ciclismo de manhã + Academia à
// tarde) e decide quais seções de perfil aparecem no cadastro. Cada perfil
// (`cycling`/`running`/`strength`) só é preenchido quando a modalidade
// correspondente está entre a principal + as adicionais.
export interface MockStudent {
  id: string;
  name: string;
  phone: string;
  discipline: string;
  secondaryDisciplines: string[];
  age: number | null;
  sex: StudentSex | null;
  heightCm: number | null;
  weightKg: number | null;
  bodyComposition: BodyComposition;
  weightHistoryNotes: string;
  medicalNotes: string;
  cycling: CyclingProfile | null;
  running: RunningProfile | null;
  strength: StrengthProfile | null;
  todayStatus: WorkoutStatus;
  stravaSynced: boolean;
  lastActivity: { name: string; distanceKm: number; date: string } | null;
}

// Único aluno de exemplo — Carlos Silva — usado para validar todas as
// funcionalidades do cockpit (cadastro, prescrição, acompanhamento e análise).
export const mockStudents: MockStudent[] = [
  {
    id: "1",
    name: "Carlos Silva",
    phone: "+5584999990001",
    discipline: "Ciclismo",
    secondaryDisciplines: [],
    age: 34,
    sex: "Masculino",
    heightCm: 178,
    weightKg: 74,
    bodyComposition: { bodyFatPct: 14, muscleMassKg: 61, waistCm: 82 },
    weightHistoryNotes: "Estável em 73-75kg nos últimos 6 meses.",
    medicalNotes: "Sem restrições médicas. Leve desconforto no joelho direito em subidas longas.",
    cycling: {
      ftpWatts: 260,
      hrMax: 188,
      hrRest: 52,
      hrThreshold: 168,
      preferredCadence: 88,
      peakPowerShort: 850,
      peakPowerLong: 275,
      mtbNotes: "Prova de MTB em julho: 45km, 900m de altimetria, TSS 210, IF 0.78.",
    },
    running: null,
    strength: null,
    todayStatus: "done",
    stravaSynced: true,
    lastActivity: { name: "Pedal matinal", distanceKm: 33, date: "hoje" },
  },
];

export const mockWorkoutDetails: Record<string, MockWorkoutDetail> = {
  "1": {
    id: "1",
    athleteName: "Carlos Silva",
    athletePhone: "+5584999990001",
    coachName: "Treinador G4",
    coachPhone: "+5584999990000",
    title: TEMPLATE_CICLISMO.title,
    discipline: TEMPLATE_CICLISMO.discipline,
    scheduledDateLabel: "Hoje · 09/09",
    status: "done",
    description: TEMPLATE_CICLISMO.description,
    prescription: TEMPLATE_CICLISMO.prescription,
    structuredIntervals: TEMPLATE_CICLISMO.structuredIntervals,
    powerZones: TEMPLATE_CICLISMO.powerZones,
    planned: TEMPLATE_CICLISMO.planned,
    completed: { ...TEMPLATE_CICLISMO.completedTemplate },
  },
};

// Monta um rascunho de treino a partir do modelo da modalidade — ponto de
// partida na aba "Criar/Prescrever treino" para um aluno sem prescrição
// prévia (ou ao trocar a modalidade).
export function buildWorkoutDraft(
  student: MockStudent,
  discipline: string,
  scheduledDateLabel: string
): MockWorkoutDetail {
  const template = templateForDiscipline(discipline);

  return {
    id: student.id,
    athleteName: student.name,
    athletePhone: student.phone,
    coachName: "Treinador G4",
    coachPhone: "+5584999990000",
    title: template.title,
    discipline: template.discipline,
    scheduledDateLabel,
    status: "pending",
    description: template.description,
    prescription: template.prescription,
    structuredIntervals: defaultIntervalsForDiscipline(template.discipline),
    powerZones: template.powerZones,
    planned: template.planned,
    completed: null,
  };
}

export const mockWeeklyHistory: { day: string; status: WorkoutStatus }[] = [
  { day: "Seg", status: "done" },
  { day: "Ter", status: "done" },
  { day: "Qua", status: "missed" },
  { day: "Qui", status: "done" },
  { day: "Sex", status: "pending" },
  { day: "Sáb", status: "pending" },
  { day: "Dom", status: "pending" },
];
