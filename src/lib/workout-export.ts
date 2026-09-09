import type { WorkoutInterval } from "./supabase/types";

interface ExportableWorkout {
  title: string;
  discipline: string;
  structuredIntervals: WorkoutInterval[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function segmentToXml(interval: WorkoutInterval): string {
  const duration = Math.round(interval.durationSeconds);
  const powerLow = (interval.targetLowPct / 100).toFixed(2);
  const powerHigh = (interval.targetHighPct / 100).toFixed(2);
  const isSteady = interval.targetLowPct === interval.targetHighPct;

  if (interval.type === "warmup") {
    return `<Warmup Duration="${duration}" PowerLow="${powerLow}" PowerHigh="${powerHigh}"/>`;
  }

  if (interval.type === "cooldown") {
    return `<Cooldown Duration="${duration}" PowerLow="${powerLow}" PowerHigh="${powerHigh}"/>`;
  }

  if (isSteady) {
    return `<SteadyState Duration="${duration}" Power="${powerHigh}"/>`;
  }

  return `<Ramp Duration="${duration}" PowerLow="${powerLow}" PowerHigh="${powerHigh}"/>`;
}

/**
 * Gera o XML .ZWO (formato de treino estruturado do Zwift, compatível com
 * importação em relógios/plataformas Garmin e Wahoo via %FTP). Só cobre
 * ciclismo — corrida/academia usariam zonas de ritmo, fora do escopo atual.
 */
export function buildZwoXml(workout: ExportableWorkout): string {
  const segments = workout.structuredIntervals.map(segmentToXml).join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
  <author>G4 Assessoria Esportiva</author>
  <name>${escapeXml(workout.title)}</name>
  <description>Exportado do painel G4. Potência em %FTP.</description>
  <sportType>bike</sportType>
  <workout>
    ${segments}
  </workout>
</workout_file>
`;
}

export function canExportZwo(workout: ExportableWorkout): boolean {
  return workout.discipline.toLowerCase().includes("ciclismo") && workout.structuredIntervals.length > 0;
}
