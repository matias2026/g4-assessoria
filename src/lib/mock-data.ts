// Dados de exemplo usados apenas para visualizar as telas antes da integração
// real com Supabase/Strava. Substitua pelas consultas em src/lib/supabase
// assim que o projeto Supabase estiver provisionado.

import type { WorkoutStatus } from "./supabase/types";

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
