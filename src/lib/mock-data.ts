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

// Treino de exemplo usado na tela de detalhes (Planejado vs. Concluído),
// no padrão TrainingPeaks. Um único id é usado para todos os links de
// demonstração (Home do atleta, Cockpit) até o treino do dia real ser
// resolvido via Supabase.
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

export const mockWorkoutDetails: Record<string, MockWorkoutDetail> = {
  [DEMO_WORKOUT_ID]: {
    id: DEMO_WORKOUT_ID,
    athleteName: "Atleta G4",
    athletePhone: "+5584999990001",
    coachName: "Treinador G4",
    coachPhone: "+5584999990000",
    title: "Intervalado de limiar",
    discipline: "Ciclismo",
    scheduledDateLabel: "Hoje · 09/09",
    status: "done",
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
    completed: {
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
  },
};

export const mockWeeklyHistory: { day: string; status: WorkoutStatus }[] = [
  { day: "Seg", status: "done" },
  { day: "Ter", status: "done" },
  { day: "Qua", status: "missed" },
  { day: "Qui", status: "done" },
  { day: "Sex", status: "pending" },
  { day: "Sáb", status: "pending" },
  { day: "Dom", status: "pending" },
];

export interface MockStudent {
  id: string;
  name: string;
  discipline: string;
  weeklyStatus: WorkoutStatus;
  lastActivity: { name: string; distanceKm: number; date: string } | null;
}

const disciplines = ["Ciclismo", "Corrida", "Academia"];
const statuses: WorkoutStatus[] = ["done", "pending", "missed"];

export const mockStudents: MockStudent[] = Array.from({ length: 15 }, (_, i) => ({
  id: String(i + 1),
  name: `Atleta ${i + 1}`,
  discipline: disciplines[i % disciplines.length],
  weeklyStatus: statuses[i % statuses.length],
  lastActivity:
    i % 4 === 3
      ? null
      : {
          name: "Pedal matinal",
          distanceKm: 20 + i * 3,
          date: "hoje",
        },
}));
