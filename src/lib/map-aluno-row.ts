// Função pura (sem "use server") — students-actions.ts e o autoatendimento
// do aluno (dashboard/profile-actions.ts) precisam dela, e um arquivo
// "use server" só pode exportar Server Actions (async), nunca um helper
// síncrono como este.
import type { MockStudent } from "@/lib/mock-data";
import type { Database } from "@/lib/supabase/types";

type AlunoRow = Database["public"]["Tables"]["alunos"]["Row"];

export function mapAlunoRow(row: AlunoRow): MockStudent {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.nome,
    phone: row.whatsapp ?? "",
    discipline: row.modalidade ?? "Ciclismo",
    secondaryDisciplines: row.secondary_disciplines,
    age: row.age,
    sex: row.sex,
    heightCm: row.altura,
    weightKg: row.peso,
    bodyComposition: row.body_composition ?? { bodyFatPct: null, muscleMassKg: null, waistCm: null },
    weightHistoryNotes: row.weight_history_notes,
    medicalNotes: row.medical_notes,
    cycling: row.cycling_profile,
    running: row.running_profile,
    strength: row.strength_profile,
    athleteReport: row.athlete_report,
    coachNotes: row.coach_notes,
    // Estado de "hoje"/Strava não faz parte da ficha do aluno — sempre
    // nasce assim, igual ao comportamento atual do AddStudentModal.
    todayStatus: "pending",
    stravaSynced: false,
    lastActivity: null,
    // Só fica sem modalidade quem foi aprovado por /solicitar-acesso
    // (createAccountCore cria a ficha mínima) — quem passa pelo cadastro
    // completo daqui sempre grava uma modalidade.
    profileComplete: row.modalidade !== null,
  };
}
