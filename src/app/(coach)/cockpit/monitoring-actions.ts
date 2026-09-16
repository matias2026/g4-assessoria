"use server";

import { createAdminClient } from "@/lib/supabase/admin";
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
  const { organizationId } = await requireCoachOrAdmin();

  // Confirma que o aluno é da própria organização antes de calcular o
  // resumo — sem isso, um treinador conseguiria ver carga/FC/ACWR de um
  // aluno de outra organização só passando o id (service role ignora RLS).
  const admin = createAdminClient();
  const { data } = await admin.from("alunos").select("id").eq("id", studentId).eq("organization_id", organizationId).maybeSingle();
  if (!data) throw new Error("Aluno não encontrado.");

  return computeMonitoringSummary(studentId, userId);
}
