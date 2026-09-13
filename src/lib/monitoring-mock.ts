// Dados de exemplo pro Monitoramento do Aluno (volume, atividades recentes,
// tendência e risco de overtraining) — mesma lógica do resto do app: a
// tela/gráficos são reais, os números vêm de um gerador determinístico
// (por aluno) até existir ingestão de atividades do Strava e histórico de
// treinos concluídos de verdade. Nunca usa Math.random() — sempre a mesma
// prévia pro mesmo aluno, sem "pular" a cada render.
import type { MockStudent } from "./mock-data";

export interface MonitoringSummary {
  weekly: { distanceKm: number; durationMinutes: number; completed: number; prescribed: number };
  monthly: { distanceKm: number; durationMinutes: number; completed: number; prescribed: number };
  recentActivities: { name: string; distanceKm: number; durationMinutes: number; date: string }[];
  trend: { label: string; value: number }[];
  trendMetricLabel: string;
  trendUnit: string;
  overtrainingRisk: "low" | "medium" | "high";
  overtrainingReasons: string[];
}

function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

// Gerador linear simples (0-999) a partir da seed — só pra variar os
// números por aluno sem depender de Math.random().
function nextValue(seed: number, index: number): number {
  return (seed * (index + 7) + index * 97) % 1000;
}

const ACTIVITY_NAMES: Record<string, string[]> = {
  Ciclismo: ["Pedal matinal", "Rodagem em Z2", "Intervalado de limiar", "Recuperação ativa"],
  Corrida: ["Rodagem longa", "Tiros de velocidade", "Fartlek", "Rodagem regenerativa"],
  Academia: ["Treino de força", "Treino funcional", "Treino de core", "Treino de pernas"],
};

/** Monta o resumo de monitoramento (volume, tendência, overtraining) pro aluno. */
export function buildMonitoringSummary(student: MockStudent): MonitoringSummary {
  const seed = seedFromId(student.id);
  const names = ACTIVITY_NAMES[student.discipline] ?? ACTIVITY_NAMES.Ciclismo;

  const weeklyDistance = 20 + (nextValue(seed, 1) % 60);
  const weeklyDuration = 180 + (nextValue(seed, 2) % 240);
  const weeklyCompleted = 3 + (nextValue(seed, 3) % 3);
  const weeklyPrescribed = weeklyCompleted + (nextValue(seed, 4) % 2);

  const recentActivities = names.slice(0, 3).map((name, i) => ({
    name,
    distanceKm: Math.round((weeklyDistance / 3) * (0.7 + (nextValue(seed, 10 + i) % 60) / 100)),
    durationMinutes: Math.round((weeklyDuration / 3) * (0.7 + (nextValue(seed, 20 + i) % 60) / 100)),
    date: i === 0 ? "Hoje" : i === 1 ? "Ontem" : "2 dias atrás",
  }));

  // Tendência: FTP (Ciclismo), pace (Corrida — menor é melhor) ou volume
  // semanal em sessões (Academia), últimas 6 semanas.
  const isRunning = student.discipline === "Corrida";
  const isStrength = student.discipline === "Academia";
  const trendMetricLabel = isRunning ? "Pace médio" : isStrength ? "Volume semanal" : "FTP";
  const trendUnit = isRunning ? "min/km" : isStrength ? "sessões" : "W";
  const baseValue = isRunning
    ? (student.running?.thresholdPace ? Number.parseFloat(student.running.thresholdPace) || 5 : 5)
    : isStrength
      ? 4
      : (student.cycling?.ftpWatts ?? 220);

  const direction = nextValue(seed, 30) % 2 === 0 ? 1 : -1;
  const trend = Array.from({ length: 6 }, (_, i) => {
    const noise = (nextValue(seed, 40 + i) % 20) / 100 - 0.1;
    const progression = direction * i * (isRunning ? 0.04 : isStrength ? 0.15 : 3);
    const value = isRunning
      ? Math.max(3.5, baseValue - progression + noise)
      : Math.max(1, baseValue + progression + noise * baseValue);
    return { label: `Sem ${i + 1}`, value: Math.round(value * 10) / 10 };
  });

  // Overtraining: cruza volume da semana vs. média do mês + sinal da
  // tendência de rendimento — não é um índice de verdade, só uma
  // combinação simples pra o card ter algo pra mostrar.
  const monthlyDistance = weeklyDistance * (3.2 + (nextValue(seed, 5) % 15) / 10);
  const loadRatio = weeklyDistance / (monthlyDistance / 4);
  const performanceDropping = isRunning ? trend[5].value > trend[0].value : trend[5].value < trend[0].value;

  let overtrainingRisk: MonitoringSummary["overtrainingRisk"] = "low";
  const overtrainingReasons: string[] = [];

  if (loadRatio > 1.3) {
    overtrainingReasons.push("Volume da última semana bem acima da média mensal.");
  }
  if (performanceDropping) {
    overtrainingReasons.push(`Queda de rendimento em ${trendMetricLabel.toLowerCase()} nas últimas semanas.`);
  }
  if (loadRatio > 1.15 && weeklyCompleted < weeklyPrescribed) {
    overtrainingReasons.push("Treinos prescritos não concluídos apesar da carga alta — sinal de fadiga acumulada.");
  }

  if (overtrainingReasons.length >= 2) overtrainingRisk = "high";
  else if (overtrainingReasons.length === 1) overtrainingRisk = "medium";

  if (overtrainingReasons.length === 0) {
    overtrainingReasons.push("Volume e rendimento dentro do esperado — nenhum sinal de alerta.");
  }

  return {
    weekly: { distanceKm: weeklyDistance, durationMinutes: weeklyDuration, completed: weeklyCompleted, prescribed: weeklyPrescribed },
    monthly: {
      distanceKm: Math.round(monthlyDistance),
      durationMinutes: weeklyDuration * 4,
      completed: weeklyCompleted * 4,
      prescribed: weeklyPrescribed * 4,
    },
    recentActivities,
    trend,
    trendMetricLabel,
    trendUnit,
    overtrainingRisk,
    overtrainingReasons,
  };
}
