"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AnalyzeTab } from "@/components/coach/AnalyzeTab";
import { PrescribeTab } from "@/components/coach/PrescribeTab";
import { RosterTab } from "@/components/coach/RosterTab";
import { TodayOverviewTab } from "@/components/coach/TodayOverviewTab";
import type { MockStudent, MockWorkoutDetail } from "@/lib/mock-data";

interface CockpitTabsProps {
  initialStudents: MockStudent[];
  initialWorkouts: Record<string, MockWorkoutDetail>;
}

type TabKey = "roster" | "prescribe" | "today" | "analyze";

const TABS: { key: TabKey; label: string }[] = [
  { key: "roster", label: "Alunos cadastrados" },
  { key: "prescribe", label: "Criar / Prescrever treino" },
  { key: "today", label: "Acompanhamento do dia" },
  { key: "analyze", label: "Analisar treino do aluno" },
];

/**
 * Shell do Cockpit do treinador: mantém o cadastro de alunos e as
 * prescrições em memória (useState) e distribui as funcionalidades em 4
 * abas, em vez de uma tela única com tudo misturado. TODO: substituir o
 * estado local por consultas/mutations reais via Supabase.
 */
export function CockpitTabs({ initialStudents, initialWorkouts }: CockpitTabsProps) {
  const [students, setStudents] = useState<MockStudent[]>(initialStudents);
  const [workouts, setWorkouts] = useState<Record<string, MockWorkoutDetail>>(initialWorkouts);
  const [activeTab, setActiveTab] = useState<TabKey>("roster");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudents[0]?.id ?? "");

  function addStudent(student: MockStudent) {
    setStudents((prev) => [...prev, student]);
    setSelectedStudentId(student.id);
  }

  function saveWorkout(studentId: string, workout: MockWorkoutDetail) {
    setWorkouts((prev) => ({ ...prev, [studentId]: workout }));
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? { ...student, discipline: workout.discipline, todayStatus: workout.status }
          : student
      )
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Rolagem horizontal em vez de empilhar os botões — os rótulos são
          longos demais pra caber dois por linha no celular, o que fazia
          virar uma pilha vertical de 4 botões só de aparência. */}
      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-g4-border bg-g4-surface p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-ring",
              activeTab === tab.key
                ? "bg-lime text-g4-ink"
                : "text-g4-muted hover:bg-g4-surface-alt hover:text-g4-ink"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "roster" && <RosterTab students={students} onAddStudent={addStudent} />}

      {activeTab === "prescribe" && (
        <PrescribeTab
          students={students}
          workouts={workouts}
          selectedStudentId={selectedStudentId}
          onSelectStudent={setSelectedStudentId}
          onSaveWorkout={saveWorkout}
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
    </div>
  );
}
