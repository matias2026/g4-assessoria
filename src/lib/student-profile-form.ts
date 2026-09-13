// Estado de formulário (campos como string, prontos pra <input>) e helpers
// de conversão pra ida-e-volta com o shape real (números/objetos) da ficha
// do aluno. Compartilhado entre o formulário do treinador (AddStudentModal,
// cria conta + edita) e o autoatendimento do aluno (AthleteProfileForm,
// "Minha ficha") — mesmos campos corporais/por modalidade nos dois, só muda
// o que embrulha o formulário (modal vs. página) e se tem e-mail/senha.
import type {
  BodyComposition,
  CyclingProfile,
  RunningProfile,
  StrengthGoal,
  StrengthProfile,
  StudentSex,
} from "@/lib/supabase/types";
import type { MockStudent } from "@/lib/mock-data";
import type { StudentProfileInput } from "@/app/(coach)/cockpit/students-actions";

export const DISCIPLINES = ["Ciclismo", "Corrida", "Academia"];
export const SEX_OPTIONS: StudentSex[] = ["Masculino", "Feminino", "Outro"];
export const STRENGTH_GOALS: StrengthGoal[] = ["Hipertrofia", "Emagrecimento", "Fortalecimento para endurance"];

export const fieldClass = "mt-1 w-full rounded-xl border border-g4-border bg-white p-2.5 text-sm text-g4-ink focus-ring";
export const labelClass = "text-xs font-medium text-g4-muted";
export const sectionClass = "rounded-2xl border border-g4-border bg-g4-surface-alt/40 p-4";
export const summaryClass = "cursor-pointer text-sm font-semibold text-g4-ink marker:text-lime-deep";
export const subSectionClass = "mt-3 rounded-xl border border-g4-border bg-white/60 p-3";

export function numOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function numToStr(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

export interface GeneralFields {
  name: string;
  phone: string;
  age: string;
  sex: StudentSex | "";
  heightCm: string;
  weightKg: string;
  bodyFatPct: string;
  muscleMassKg: string;
  waistCm: string;
  weightHistoryNotes: string;
  medicalNotes: string;
}

export interface CyclingFields {
  ftpWatts: string;
  hrMax: string;
  hrRest: string;
  hrThreshold: string;
  preferredCadence: string;
  peakPowerShort: string;
  peakPowerLong: string;
  mtbNotes: string;
}

export interface RunningFields {
  thresholdPace: string;
  vo2max: string;
  hrMax: string;
  hrThreshold: string;
  pr5k: string;
  pr10k: string;
  prHalfMarathon: string;
  cadence: string;
  strideLengthCm: string;
  verticalOscillationCm: string;
}

export interface StrengthFields {
  goal: StrengthGoal | "";
  squat1RM: string;
  deadlift1RM: string;
  benchPress1RM: string;
  legPress1RM: string;
  focusNotes: string;
  asymmetryNotes: string;
}

export const BLANK_GENERAL: GeneralFields = {
  name: "",
  phone: "",
  age: "",
  sex: "",
  heightCm: "",
  weightKg: "",
  bodyFatPct: "",
  muscleMassKg: "",
  waistCm: "",
  weightHistoryNotes: "",
  medicalNotes: "",
};
export const BLANK_CYCLING: CyclingFields = {
  ftpWatts: "",
  hrMax: "",
  hrRest: "",
  hrThreshold: "",
  preferredCadence: "",
  peakPowerShort: "",
  peakPowerLong: "",
  mtbNotes: "",
};
export const BLANK_RUNNING: RunningFields = {
  thresholdPace: "",
  vo2max: "",
  hrMax: "",
  hrThreshold: "",
  pr5k: "",
  pr10k: "",
  prHalfMarathon: "",
  cadence: "",
  strideLengthCm: "",
  verticalOscillationCm: "",
};
export const BLANK_STRENGTH: StrengthFields = {
  goal: "",
  squat1RM: "",
  deadlift1RM: "",
  benchPress1RM: "",
  legPress1RM: "",
  focusNotes: "",
  asymmetryNotes: "",
};

export function generalFieldsFromStudent(student: MockStudent): GeneralFields {
  return {
    ...BLANK_GENERAL,
    name: student.name,
    phone: student.phone,
    age: numToStr(student.age),
    sex: student.sex ?? "",
    heightCm: numToStr(student.heightCm),
    weightKg: numToStr(student.weightKg),
    bodyFatPct: numToStr(student.bodyComposition.bodyFatPct),
    muscleMassKg: numToStr(student.bodyComposition.muscleMassKg),
    waistCm: numToStr(student.bodyComposition.waistCm),
    weightHistoryNotes: student.weightHistoryNotes,
    medicalNotes: student.medicalNotes,
  };
}

export function cyclingFieldsFromStudent(student: MockStudent): CyclingFields {
  const c = student.cycling;
  if (!c) return BLANK_CYCLING;
  return {
    ftpWatts: numToStr(c.ftpWatts),
    hrMax: numToStr(c.hrMax),
    hrRest: numToStr(c.hrRest),
    hrThreshold: numToStr(c.hrThreshold),
    preferredCadence: numToStr(c.preferredCadence),
    peakPowerShort: numToStr(c.peakPowerShort),
    peakPowerLong: numToStr(c.peakPowerLong),
    mtbNotes: c.mtbNotes,
  };
}

export function runningFieldsFromStudent(student: MockStudent): RunningFields {
  const r = student.running;
  if (!r) return BLANK_RUNNING;
  return {
    thresholdPace: r.thresholdPace,
    vo2max: numToStr(r.vo2max),
    hrMax: numToStr(r.hrMax),
    hrThreshold: numToStr(r.hrThreshold),
    pr5k: r.pr5k,
    pr10k: r.pr10k,
    prHalfMarathon: r.prHalfMarathon,
    cadence: numToStr(r.cadence),
    strideLengthCm: numToStr(r.strideLengthCm),
    verticalOscillationCm: numToStr(r.verticalOscillationCm),
  };
}

export function strengthFieldsFromStudent(student: MockStudent): StrengthFields {
  const s = student.strength;
  if (!s) return BLANK_STRENGTH;
  return {
    goal: s.goal ?? "",
    squat1RM: numToStr(s.squat1RM),
    deadlift1RM: numToStr(s.deadlift1RM),
    benchPress1RM: numToStr(s.benchPress1RM),
    legPress1RM: numToStr(s.legPress1RM),
    focusNotes: s.focusNotes,
    asymmetryNotes: s.asymmetryNotes,
  };
}

export interface DisciplineSelection {
  primaryDiscipline: string;
  secondaryDisciplines: string[];
}

/** Monta o payload final (StudentProfileInput, sem e-mail/senha) a partir dos estados de formulário. */
export function buildProfileInput(
  general: GeneralFields,
  discipline: DisciplineSelection,
  cycling: CyclingFields,
  running: RunningFields,
  strength: StrengthFields,
  coachNotes: string
): Omit<StudentProfileInput, "coachNotes"> & { coachNotes: string } {
  const practiced = [discipline.primaryDiscipline, ...discipline.secondaryDisciplines];
  const isCycling = practiced.includes("Ciclismo");
  const isRunning = practiced.includes("Corrida");
  const isStrength = practiced.includes("Academia");

  const cyclingProfile: CyclingProfile | null = isCycling
    ? {
        ftpWatts: numOrNull(cycling.ftpWatts),
        hrMax: numOrNull(cycling.hrMax),
        hrRest: numOrNull(cycling.hrRest),
        hrThreshold: numOrNull(cycling.hrThreshold),
        preferredCadence: numOrNull(cycling.preferredCadence),
        peakPowerShort: numOrNull(cycling.peakPowerShort),
        peakPowerLong: numOrNull(cycling.peakPowerLong),
        mtbNotes: cycling.mtbNotes.trim(),
      }
    : null;

  const runningProfile: RunningProfile | null = isRunning
    ? {
        thresholdPace: running.thresholdPace.trim(),
        vo2max: numOrNull(running.vo2max),
        hrMax: numOrNull(running.hrMax),
        hrThreshold: numOrNull(running.hrThreshold),
        pr5k: running.pr5k.trim(),
        pr10k: running.pr10k.trim(),
        prHalfMarathon: running.prHalfMarathon.trim(),
        cadence: numOrNull(running.cadence),
        strideLengthCm: numOrNull(running.strideLengthCm),
        verticalOscillationCm: numOrNull(running.verticalOscillationCm),
      }
    : null;

  const strengthProfile: StrengthProfile | null = isStrength
    ? {
        goal: strength.goal || null,
        squat1RM: numOrNull(strength.squat1RM),
        deadlift1RM: numOrNull(strength.deadlift1RM),
        benchPress1RM: numOrNull(strength.benchPress1RM),
        legPress1RM: numOrNull(strength.legPress1RM),
        focusNotes: strength.focusNotes.trim(),
        asymmetryNotes: strength.asymmetryNotes.trim(),
      }
    : null;

  const bodyComposition: BodyComposition = {
    bodyFatPct: numOrNull(general.bodyFatPct),
    muscleMassKg: numOrNull(general.muscleMassKg),
    waistCm: numOrNull(general.waistCm),
  };

  return {
    name: general.name.trim(),
    phone: general.phone.trim(),
    discipline: discipline.primaryDiscipline,
    secondaryDisciplines: discipline.secondaryDisciplines,
    age: numOrNull(general.age),
    sex: general.sex || null,
    heightCm: numOrNull(general.heightCm),
    weightKg: numOrNull(general.weightKg),
    bodyComposition,
    weightHistoryNotes: general.weightHistoryNotes.trim(),
    medicalNotes: general.medicalNotes.trim(),
    cycling: cyclingProfile,
    running: runningProfile,
    strength: strengthProfile,
    coachNotes,
  };
}
