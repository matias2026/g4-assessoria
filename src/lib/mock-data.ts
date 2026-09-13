// Dados de exemplo usados apenas para visualizar as telas antes da integração
// real com Supabase/Strava. Substitua pelas consultas em src/lib/supabase
// assim que o projeto Supabase estiver provisionado.
//
// O Cockpit do treinador roda com um único aluno de exemplo (Carlos Silva) —
// suficiente para validar todas as abas (cadastro, prescrição, acompanhamento
// e análise) sem o ruído de uma lista fictícia grande. Novos alunos
// cadastrados pela aba "Alunos cadastrados" entram em memória (useState),
// até a persistência real via Supabase.

import type {
  BodyComposition,
  CyclingProfile,
  LastActivity,
  PrescriptionContent,
  RunningProfile,
  StrengthGoal,
  StrengthProfile,
  StudentSex,
  TrainingSession,
  UploadedActivity,
  WorkoutCompletionSource,
  WorkoutInterval,
  WorkoutStatus,
} from "./supabase/types";
import type { ZoneDatum } from "@/components/workout/ZonesChart";

// Contato único do treinador — o app hoje atende um treinador só, então
// isso é constante em vez de vir de alguma tabela. Reaproveitado nos
// templates de treino abaixo e nas telas de "Meu perfil" do aluno.
export const DEFAULT_COACH_NAME = "Treinador G4";
export const DEFAULT_COACH_PHONE = "+5584999990000";

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
  trainingSessions: TrainingSession[];
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
  // Amostras reais de série temporal decodificadas de um .FIT enviado pelo
  // aluno (ver src/lib/fit-import.ts) — null enquanto ele não sobe nenhum
  // arquivo. A aba "Analisar treino do aluno" só mostra os gráficos de
  // potência/FC/cadência/altimetria/velocidade quando isso existe, nunca
  // com dado inventado.
  uploadedActivity: UploadedActivity | null;
}

export const DEMO_WORKOUT_ID = "1";

// Modalidades que o admin pode pré-visualizar na área do atleta (sem ter
// uma linha própria em `alunos`) — usado tanto no treino do dia quanto
// nas telas de "Meu perfil" (ficha/senha/relatório).
export const PREVIEW_DISCIPLINES = ["Ciclismo", "Corrida", "Academia"];

// Um modelo de treino por modalidade — usado como ponto de partida na aba
// "Criar/Prescrever treino" quando o treinador escolhe a modalidade.
export interface WorkoutTemplate {
  title: string;
  discipline: string;
  description: string;
  prescription: MockWorkoutDetail["prescription"];
  structuredIntervals: WorkoutInterval[];
  trainingSessions: TrainingSession[];
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
  trainingSessions: [],
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
  trainingSessions: [],
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
  // Exemplo no padrão MFIT: vários treinos nomeados por plano, cada um com
  // exercícios (nome + vídeo demonstrativo + séries em texto livre de
  // série/rep e carga, como um app de musculação).
  trainingSessions: [
    {
      name: "Treino 1",
      exercises: [
        {
          name: "Remo",
          // Placeholder de QA (vídeo público conhecido) — o treinador troca
          // pelo vídeo real ao prescrever de verdade. Serve pra confirmar
          // que o player incorporado funciona assim que um aluno real de
          // Academia loga, sem precisar prescrever nada antes.
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          sets: [
            { reps: "4x8", load: "média", restSeconds: 90 },
            { reps: "4x8", load: "média", restSeconds: 90 },
          ],
        },
        {
          name: "Crucifixo Máquina",
          videoUrl: null,
          sets: [
            { reps: "3x12", load: "leve", restSeconds: 60 },
            { reps: "3x12", load: "leve", restSeconds: 60 },
          ],
        },
      ],
    },
    {
      name: "Treino 2",
      exercises: [
        {
          name: "Agachamento",
          videoUrl: null,
          sets: [
            { reps: "4x6", load: "pesada", restSeconds: 120 },
            { reps: "4x6", load: "pesada", restSeconds: 120 },
          ],
        },
        {
          name: "Leg Press",
          videoUrl: null,
          sets: [{ reps: "3x10", load: "média", restSeconds: 90 }],
        },
      ],
    },
  ],
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

// Ponto de partida de um treino novo de Academia: um treino nomeado com um
// exercício em branco — o treinador adiciona o resto manualmente.
const DEFAULT_TRAINING_SESSION: TrainingSession = {
  name: "Treino 1",
  exercises: [
    {
      name: "",
      videoUrl: null,
      sets: [{ reps: "", load: "", restSeconds: 60 }],
    },
  ],
};

export function defaultTrainingSessionsForDiscipline(discipline: string): TrainingSession[] {
  return discipline === "Academia" ? [structuredClone(DEFAULT_TRAINING_SESSION)] : [];
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
  lastActivity: LastActivity | null;
  // false só pra conta aprovada por /solicitar-acesso, que nasce só com
  // nome (sem modalidade) — precisa que o treinador complete a ficha.
  profileComplete: boolean;
  // "Relatório" do próprio aluno (livre, em "Meu perfil") e "Relatório do
  // treinador" (comentário geral do treinador sobre esse aluno, visível
  // pra ele) — texto livre, cada um editado só pelo seu autor.
  athleteReport: string;
  coachNotes: string;
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
    profileComplete: true,
    athleteReport: "",
    coachNotes: "",
  },
  {
    id: "2",
    name: "Marina Costa",
    phone: "+5584999990002",
    discipline: "Corrida",
    secondaryDisciplines: [],
    age: 28,
    sex: "Feminino",
    heightCm: 165,
    weightKg: 56,
    bodyComposition: { bodyFatPct: 19, muscleMassKg: 42, waistCm: 68 },
    weightHistoryNotes: "Estável em 55-57kg nos últimos 3 meses.",
    medicalNotes: "Sem restrições médicas. Histórico de fascite plantar, hoje controlada.",
    cycling: null,
    running: {
      thresholdPace: "4:45",
      vo2max: 48,
      hrMax: 192,
      hrThreshold: 172,
      pr5k: "21:30",
      pr10k: "45:10",
      prHalfMarathon: "1:42:00",
      cadence: 176,
      strideLengthCm: 112,
      verticalOscillationCm: 8,
    },
    strength: null,
    todayStatus: "pending",
    stravaSynced: true,
    lastActivity: { name: "Rodagem regenerativa", distanceKm: 8, date: "ontem" },
    profileComplete: true,
    athleteReport: "",
    coachNotes: "",
  },
  {
    id: "3",
    name: "Rafael Souza",
    phone: "+5584999990003",
    discipline: "Academia",
    secondaryDisciplines: [],
    age: 31,
    sex: "Masculino",
    heightCm: 180,
    weightKg: 84,
    bodyComposition: { bodyFatPct: 17, muscleMassKg: 68, waistCm: 88 },
    weightHistoryNotes: "Ganhou 3kg de massa magra nos últimos 4 meses.",
    medicalNotes: "Sem restrições médicas. Leve desconforto no ombro direito em supino.",
    cycling: null,
    running: null,
    strength: {
      goal: "Hipertrofia",
      squat1RM: 140,
      deadlift1RM: 170,
      benchPress1RM: 100,
      legPress1RM: 320,
      focusNotes: "Foco em membros inferiores e core nesta fase.",
      asymmetryNotes: "Leve assimetria de força entre pernas (esquerda mais fraca).",
    },
    todayStatus: "pending",
    stravaSynced: false,
    lastActivity: null,
    profileComplete: true,
    athleteReport: "",
    coachNotes: "",
  },
];

export const mockWorkoutDetails: Record<string, MockWorkoutDetail> = {
  "1": {
    id: "1",
    athleteName: "Carlos Silva",
    athletePhone: "+5584999990001",
    coachName: DEFAULT_COACH_NAME,
    coachPhone: DEFAULT_COACH_PHONE,
    title: TEMPLATE_CICLISMO.title,
    discipline: TEMPLATE_CICLISMO.discipline,
    scheduledDateLabel: "Hoje · 09/09",
    status: "done",
    description: TEMPLATE_CICLISMO.description,
    prescription: TEMPLATE_CICLISMO.prescription,
    structuredIntervals: TEMPLATE_CICLISMO.structuredIntervals,
    trainingSessions: TEMPLATE_CICLISMO.trainingSessions,
    powerZones: TEMPLATE_CICLISMO.powerZones,
    planned: TEMPLATE_CICLISMO.planned,
    completed: { ...TEMPLATE_CICLISMO.completedTemplate },
    uploadedActivity: null,
  },
  "2": {
    id: "2",
    athleteName: "Marina Costa",
    athletePhone: "+5584999990002",
    coachName: DEFAULT_COACH_NAME,
    coachPhone: DEFAULT_COACH_PHONE,
    title: TEMPLATE_CORRIDA.title,
    discipline: TEMPLATE_CORRIDA.discipline,
    scheduledDateLabel: "Hoje · 09/09",
    status: "pending",
    description: TEMPLATE_CORRIDA.description,
    prescription: TEMPLATE_CORRIDA.prescription,
    structuredIntervals: TEMPLATE_CORRIDA.structuredIntervals,
    trainingSessions: TEMPLATE_CORRIDA.trainingSessions,
    powerZones: TEMPLATE_CORRIDA.powerZones,
    planned: TEMPLATE_CORRIDA.planned,
    completed: null,
    uploadedActivity: null,
  },
  "3": {
    id: "3",
    athleteName: "Rafael Souza",
    athletePhone: "+5584999990003",
    coachName: DEFAULT_COACH_NAME,
    coachPhone: DEFAULT_COACH_PHONE,
    title: TEMPLATE_ACADEMIA.title,
    discipline: TEMPLATE_ACADEMIA.discipline,
    scheduledDateLabel: "Hoje · 09/09",
    status: "pending",
    description: TEMPLATE_ACADEMIA.description,
    prescription: TEMPLATE_ACADEMIA.prescription,
    structuredIntervals: TEMPLATE_ACADEMIA.structuredIntervals,
    trainingSessions: TEMPLATE_ACADEMIA.trainingSessions,
    powerZones: TEMPLATE_ACADEMIA.powerZones,
    planned: TEMPLATE_ACADEMIA.planned,
    completed: null,
    uploadedActivity: null,
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
    coachName: DEFAULT_COACH_NAME,
    coachPhone: DEFAULT_COACH_PHONE,
    title: template.title,
    discipline: template.discipline,
    scheduledDateLabel,
    status: "pending",
    description: template.description,
    prescription: template.prescription,
    structuredIntervals: defaultIntervalsForDiscipline(template.discipline),
    trainingSessions: defaultTrainingSessionsForDiscipline(template.discipline),
    powerZones: template.powerZones,
    planned: template.planned,
    completed: null,
    uploadedActivity: null,
  };
}

// Monta um treino de exemplo a partir do modelo da modalidade, mantendo o
// conteúdo rico do template (exercícios, vídeo) — diferente de
// buildWorkoutDraft, que começa em branco de propósito (é o ponto de
// partida do formulário do treinador). Usado na tela do aluno quando
// ainda não existe uma prescrição real pra mostrar.
export function buildExampleWorkout(
  student: { id: string; name: string; phone: string },
  discipline: string,
  scheduledDateLabel: string
): MockWorkoutDetail {
  const template = templateForDiscipline(discipline);

  return {
    id: student.id,
    athleteName: student.name,
    athletePhone: student.phone,
    coachName: DEFAULT_COACH_NAME,
    coachPhone: DEFAULT_COACH_PHONE,
    title: template.title,
    discipline: template.discipline,
    scheduledDateLabel,
    status: "pending",
    description: template.description,
    prescription: template.prescription,
    structuredIntervals: template.structuredIntervals,
    trainingSessions: template.trainingSessions,
    powerZones: template.powerZones,
    planned: template.planned,
    completed: null,
    uploadedActivity: null,
  };
}

/**
 * Monta o treino real que o treinador prescreveu (linha de `treinos`,
 * `conteudo` jsonb) — diferente de buildExampleWorkout, que sempre mostra
 * o modelo genérico da modalidade. Usado quando existe uma prescrição de
 * verdade pro dia; sem uma, a página do aluno cai de volta pro exemplo.
 */
export function buildPrescribedWorkout(
  student: { id: string; name: string; phone: string },
  scheduledDateLabel: string,
  treino: {
    titulo: string | null;
    modalidade: string | null;
    descricao: string | null;
    concluido: boolean | null;
    conteudo: PrescriptionContent | null;
    rpe_esforco?: number | null;
    sensacao?: number | null;
    comentarios?: string | null;
    atividade_fit?: UploadedActivity | null;
  }
): MockWorkoutDetail {
  const conteudo = treino.conteudo ?? {};
  const atividade = treino.atividade_fit ?? null;

  return {
    id: student.id,
    athleteName: student.name,
    athletePhone: student.phone,
    coachName: DEFAULT_COACH_NAME,
    coachPhone: DEFAULT_COACH_PHONE,
    title: treino.titulo ?? "Treino do dia",
    discipline: treino.modalidade ?? "Ciclismo",
    scheduledDateLabel,
    status: treino.concluido ? "done" : "pending",
    description: treino.descricao ?? "",
    prescription: conteudo.prescription ?? { warmup: "", mainSet: "", cooldown: "", videoUrl: null },
    structuredIntervals: conteudo.structuredIntervals ?? [],
    trainingSessions: conteudo.trainingSessions ?? [],
    powerZones: conteudo.powerZones ?? [],
    planned: conteudo.planned ?? {
      durationSeconds: null,
      distanceMeters: null,
      tss: null,
      ifScore: null,
      hrMin: null,
      hrAvg: null,
      hrMax: null,
    },
    completed: treino.concluido
      ? {
          source: "manual",
          durationSeconds: atividade?.durationSeconds ?? null,
          distanceMeters: atividade?.distanceMeters ?? null,
          tss: null,
          ifScore: null,
          hrMin: null,
          hrAvg: atividade?.avgHeartRate ?? null,
          hrMax: atividade?.maxHeartRate ?? null,
          rpe: treino.rpe_esforco ?? null,
          feeling: treino.sensacao ?? null,
          comments: treino.comentarios ?? null,
          aiFeedbackDraft: null,
          coachFeedback: null,
        }
      : null,
    uploadedActivity: atividade,
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
