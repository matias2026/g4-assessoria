import { Encoder, Profile } from "@garmin/fitsdk";
import type { FileIdMesg, WorkoutMesg, WorkoutStepMesg } from "@garmin/fitsdk";
import type { WorkoutInterval, WorkoutIntervalType } from "./supabase/types";

interface ExportableWorkout {
  title: string;
  discipline: string;
  structuredIntervals: WorkoutInterval[];
}

// Só ciclismo e corrida têm blocos estruturados (ver defaultIntervalsForDiscipline
// em mock-data.ts) — Academia usa treinos/exercícios, sem equivalente em .FIT.
export function canExportStructuredWorkout(workout: ExportableWorkout): boolean {
  const d = workout.discipline.toLowerCase();
  return (d.includes("ciclismo") || d.includes("corrida")) && workout.structuredIntervals.length > 0;
}

// Números e enums abaixo vêm direto do FIT Profile embutido no pacote
// (node_modules/@garmin/fitsdk/src/profile.js), conferidos em runtime —
// não de memória — pra não gerar um binário inválido por campo/enum errado.
const FILE_TYPE_WORKOUT = 5; // Profile.types.file.workout
const MANUFACTURER_DEVELOPMENT = 255; // Profile.types.manufacturer.development
const SPORT_RUNNING = 1;
const SPORT_CYCLING = 2;
const DURATION_TYPE_TIME = 0; // Profile.types.wktStepDuration.time

// Profile.types.wktStepTarget — "open" = sem alvo.
const TARGET_OPEN = 2;
const TARGET_HEART_RATE = 1;
const TARGET_CADENCE = 3;
const TARGET_POWER = 4;

// Profile.types.workoutCapabilities (bit flags).
const CAP_INTERVAL = 0x0001;
const CAP_HEART_RATE = 0x0100;
const CAP_CADENCE = 0x0400;
const CAP_POWER = 0x0800;

// Profile.types.intensity.
const INTENSITY_BY_TYPE: Record<WorkoutIntervalType, number> = {
  warmup: 2,
  cooldown: 3,
  recovery: 4,
  steady: 0, // "active"
  interval: 5,
};

function sportForDiscipline(discipline: string): number {
  return discipline.toLowerCase().includes("corrida") ? SPORT_RUNNING : SPORT_CYCLING;
}

// Um bloco pode combinar Potência + FC + Cadência na tela, mas o formato
// .FIT só tem 2 "slots" de alvo por passo (target_type/alvo principal +
// secondary_target_type/alvo secundário) — não existe um terceiro. Quando
// os 3 estão marcados, o menos crítico pro pedal/corrida em si (cadência)
// fica de fora do arquivo de teste; potência e FC, que carregam a
// intensidade do bloco, sempre são exportados quando presentes.
type TargetKind = "power" | "hr" | "cadence";

function targetOrder(interval: WorkoutInterval): TargetKind[] {
  const order: TargetKind[] = [];
  if (interval.power) order.push("power");
  if (interval.hr) order.push("hr");
  if (interval.cadence) order.push("cadence");
  return order;
}

function applyTarget(step: WorkoutStepMesg, kind: TargetKind, interval: WorkoutInterval, slot: "primary" | "secondary") {
  if (kind === "power") {
    // Profile.types.workoutPower: 0-1000 = %FTP direto; >1000 = watts absolutos + 1000.
    // Nossos alvos são sempre %FTP, então o valor vai direto, sem offset.
    if (slot === "primary") {
      step.targetType = TARGET_POWER;
      step.customTargetPowerLow = interval.power!.lowPct;
      step.customTargetPowerHigh = interval.power!.highPct;
    } else {
      step.secondaryTargetType = TARGET_POWER;
      step.secondaryCustomTargetPowerLow = interval.power!.lowPct;
      step.secondaryCustomTargetPowerHigh = interval.power!.highPct;
    }
  } else if (kind === "hr") {
    // Zona de FC (1-5) direto no campo de zona — não precisa converter pra
    // bpm aqui; o bpm exibido na tela (hrZoneRange) é só uma referência
    // pro treinador, a zona é o que o relógio do aluno realmente usa. O
    // formato .FIT só aceita 1 zona por passo (sem noção de rampa entre
    // duas zonas), então exporta toZone — a zona-alvo de chegada do bloco.
    if (slot === "primary") {
      step.targetType = TARGET_HEART_RATE;
      step.targetHrZone = interval.hr!.toZone;
    } else {
      step.secondaryTargetType = TARGET_HEART_RATE;
      step.secondaryTargetHrZone = interval.hr!.toZone;
    }
  } else {
    if (slot === "primary") {
      step.targetType = TARGET_CADENCE;
      step.customTargetCadenceLow = interval.cadence!.low;
      step.customTargetCadenceHigh = interval.cadence!.high;
    } else {
      step.secondaryTargetType = TARGET_CADENCE;
      step.secondaryCustomTargetCadenceLow = interval.cadence!.low;
      step.secondaryCustomTargetCadenceHigh = interval.cadence!.high;
    }
  }
}

function computeCapabilities(intervals: WorkoutInterval[]): number {
  let caps = CAP_INTERVAL;
  for (const interval of intervals) {
    const [primary, secondary] = targetOrder(interval);
    for (const kind of [primary, secondary]) {
      if (kind === "power") caps |= CAP_POWER;
      else if (kind === "hr") caps |= CAP_HEART_RATE;
      else if (kind === "cadence") caps |= CAP_CADENCE;
    }
  }
  return caps;
}

/**
 * Gera um arquivo .FIT binário (treino estruturado nativo Garmin) a partir
 * de `structuredIntervals`, usando o SDK oficial da Garmin no navegador —
 * sem round-trip ao servidor. Cobre ciclismo e corrida; cada bloco pode
 * levar potência, FC (por zona) e cadência combinados, respeitando o
 * limite de 2 alvos simultâneos por passo do próprio formato .FIT.
 */
export function buildFitWorkout(workout: ExportableWorkout): Uint8Array {
  const encoder = new Encoder();

  const fileId: FileIdMesg = {
    type: FILE_TYPE_WORKOUT,
    manufacturer: MANUFACTURER_DEVELOPMENT,
    product: 0,
    serialNumber: 1,
    timeCreated: new Date(),
  };
  encoder.onMesg(Profile.MesgNum.FILE_ID, fileId);

  const workoutMesg: WorkoutMesg = {
    sport: sportForDiscipline(workout.discipline),
    capabilities: computeCapabilities(workout.structuredIntervals),
    numValidSteps: workout.structuredIntervals.length,
    wktName: workout.title,
  };
  encoder.onMesg(Profile.MesgNum.WORKOUT, workoutMesg);

  workout.structuredIntervals.forEach((interval, index) => {
    const step: WorkoutStepMesg = {
      messageIndex: index,
      durationType: DURATION_TYPE_TIME,
      durationValue: Math.round(interval.durationSeconds * 1000),
      intensity: INTENSITY_BY_TYPE[interval.type],
      targetType: TARGET_OPEN,
    };

    const [primary, secondary] = targetOrder(interval);
    if (primary) applyTarget(step, primary, interval, "primary");
    if (secondary) applyTarget(step, secondary, interval, "secondary");

    encoder.onMesg(Profile.MesgNum.WORKOUT_STEP, step);
  });

  return encoder.close();
}
