"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AnalyzeTab } from "@/components/coach/AnalyzeTab";
import { MonitoringTab } from "@/components/coach/MonitoringTab";
import { PrescribeTab } from "@/components/coach/PrescribeTab";
import { PrescribedWorkoutsTab } from "@/components/coach/PrescribedWorkoutsTab";
import { RosterTab } from "@/components/coach/RosterTab";
import { TodayOverviewTab } from "@/components/coach/TodayOverviewTab";
import type { MockStudent, MockWorkoutDetail } from "@/lib/mock-data";
import type { ExerciseLibraryItem } from "@/lib/supabase/types";
import {
  completeStudentProfile,
  createStudentAccount,
  type CreateStudentInput,
  type StudentProfileInput,
} from "@/app/(coach)/cockpit/students-actions";
import { saveDraft, sendPrescription } from "@/app/(coach)/cockpit/prescription-actions";

interface CockpitTabsProps {
  initialStudents: MockStudent[];
  initialWorkouts: Record<string, MockWorkoutDetail>;
  initialExerciseLibrary: ExerciseLibraryItem[];
}

type TabKey = "roster" | "prescribe" | "workouts" | "today" | "analyze" | "monitoring";

const TABS: { key: TabKey; label: string }[] = [
  { key: "roster", label: "Alunos cadastrados" },
  { key: "prescribe", label: "Criar / Prescrever treino" },
  { key: "workouts", label: "Treinos cadastrados" },
  { key: "today", label: "Acompanhamento do dia" },
  { key: "analyze", label: "Analisar treino do aluno" },
  { key: "monitoring", label: "Monitoramento do aluno" },
];

/**
 * Shell do Cockpit do treinador: mantém o cadastro de alunos e as
 * prescrições em memória (useState) e distribui as funcionalidades em 4
 * abas, em vez de uma tela única com tudo misturado. TODO: substituir o
 * estado local por consultas/mutations reais via Supabase.
 */
export function CockpitTabs({
  initialStudents,
  initialWorkouts,
  initialExerciseLibrary,
}: CockpitTabsProps) {
  const [students, setStudents] = useState<MockStudent[]>(initialStudents);
  const [workouts, setWorkouts] = useState<Record<string, MockWorkoutDetail>>(initialWorkouts);
  const [activeTab, setActiveTab] = useState<TabKey>("roster");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudents[0]?.id ?? "");

  async function addStudent(input: CreateStudentInput) {
    const created = await createStudentAccount(input);
    setStudents((prev) => [...prev, created]);
    setSelectedStudentId(created.id);
  }

  async function saveProfile(id: string, input: StudentProfileInput) {
    const updated = await completeStudentProfile(id, input);
    setStudents((prev) => prev.map((student) => (student.id === id ? updated : student)));
  }

  function applyWorkoutLocally(studentId: string, workout: MockWorkoutDetail) {
    setWorkouts((prev) => ({ ...prev, [studentId]: workout }));
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? { ...student, discipline: workout.discipline, todayStatus: workout.status }
          : student
      )
    );
  }

  // "Salvar prescrição" — rascunho, o aluno não vê ainda.
  async function saveWorkout(studentId: string, dateIso: string, workout: MockWorkoutDetail) {
    await saveDraft(studentId, dateIso, workout);
    applyWorkoutLocally(studentId, workout);
  }

  // "Enviar treino" — publica de vez, agora sim aparece no painel do aluno.
  async function sendWorkout(studentId: string, dateIso: string, workout: MockWorkoutDetail) {
    await sendPrescription(studentId, dateIso, workout);
    applyWorkoutLocally(studentId, workout);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Rolagem horizontal em vez de empilhar os botões — os rótulos são
          longos demais pra caber dois por linha no celular, o que fazia
          virar uma pilha vertical de 4 botões só de aparência. */}
      <nav className="flex gap-4 overflow-x-auto rounded-2xl border border-g4-border bg-g4-surface p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-ring",
              activeTab === tab.key
                ? "bg-lime text-ink-on-lime"
                : "text-g4-muted hover:bg-g4-surface-alt hover:text-g4-ink"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "roster" && (
        <RosterTab students={students} onAddStudent={addStudent} onSaveProfile={saveProfile} />
      )}

      {activeTab === "prescribe" && (
        <PrescribeTab
          students={students}
          workouts={workouts}
          selectedStudentId={selectedStudentId}
          onSelectStudent={setSelectedStudentId}
          onSaveWorkout={saveWorkout}
          onSendWorkout={sendWorkout}
          initialExerciseLibrary={initialExerciseLibrary}
        />
      )}

      {activeTab === "workouts" && (
        <PrescribedWorkoutsTab
          students={students}
          workouts={workouts}
          onViewWorkout={(studentId) => {
            setSelectedStudentId(studentId);
            setActiveTab("analyze");
          }}
        />
      )}

      {activeTab === "today" && <TodayOverviewTab students={students} />}

      {activeTab === "analyze" && (
        <AnalyzeTab
          students={students}
          workouts={workouts}
          selectedStudentId={selectedStudentId}
          onSelectStudent={setSelectedStudentId}
        />
      )}

      {activeTab === "monitoring" && (
        <MonitoringTab
          students={students}
          selectedStudentId={selectedStudentId}
          onSelectStudent={setSelectedStudentId}
        />
      )}
    </div>
  );
}
