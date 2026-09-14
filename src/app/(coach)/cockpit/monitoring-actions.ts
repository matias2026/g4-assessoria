"use server";

import { computeMonitoringSummary, type MonitoringSummary } from "@/lib/monitoring";
import { requireCoachOrAdmin } from "./actions";

export type {
  CompletedSessionSource,
  CompletedSession,
  LoadMetric,
  WeeklyLoad,
  AcwrHistoryPoint,
  AcwrResult,
  CardiacEfficiencyPoint,
  CardiacEfficiencyResult,
  WeeklyZoneMinutes,
  ZoneLoadResult,
  RpeTrendResult,
  MonitoringSummary,
} from "@/lib/monitoring";

/**
 * Resumo de treinos concluídos pra aba "Monitoramento do Aluno" (só
 * treinador/admin) — o cálculo em si mora em src/lib/monitoring.ts,
 * compartilhado com o resumo que o próprio aluno vê da própria conta (ver
 * getOwnMonitoringSummary em dashboard/profile-actions.ts); aqui só cuida
 * da trava de acesso.
 */
export async function getMonitoringSummary(studentId: string, userId: string | null): Promise<MonitoringSummary> {
  await requireCoachOrAdmin();
  return computeMonitoringSummary(studentId, userId);
}
