"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { IntervalEditor } from "@/components/workout/IntervalEditor";
import { WorkoutPrescriptionEditor, type PlannedMetrics } from "@/components/workout/WorkoutPrescriptionEditor";
import { buildWhatsAppLink, buildWorkoutWhatsAppMessage } from "@/lib/whatsapp";
import { buildWorkoutDraft, templateForDiscipline } from "@/lib/mock-data";
import type { MockStudent, MockWorkoutDetail } from "@/lib/mock-data";
import type { WorkoutInterval } from "@/lib/supabase/types";

interface PrescribeTabProps {
  students: MockStudent[];
  workouts: Record<string, MockWorkoutDetail>;
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  onSaveWorkout: (studentId: string, workout: MockWorkoutDetail) => void;
}

const DISCIPLINES = ["Ciclismo", "Corrida", "Academia"];
const fieldClass =
  "mt-1 w-full rounded-xl border border-g4-border bg-white p-2.5 text-sm text-g4-ink focus-ring";
const labelClass = "text-xs font-medium text-g4-muted";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Aba "Criar/Prescrever treino": formulário completo — aluno, data,
 * modalidade, blocos estruturados (aquecimento/tiros/desaquecimento),
 * metas de TSS/IF e link de vídeo — com envio direto por WhatsApp.
 * A troca de aluno remonta o formulário (via `key`) para carregar a
 * prescrição existente dele, se houver, ou um rascunho a partir do modelo
 * da modalidade.
 */
export function PrescribeTab({
  students,
  workouts,
  selectedStudentId,
  onSelectStudent,
  onSaveWorkout,
}: PrescribeTabProps) {
  const student = students.find((s) => s.id === selectedStudentId) ?? students[0];

  if (!student) {
    return (
      <p className="text-sm text-g4-muted">
        Cadastre um aluno na aba &quot;Alunos cadastrados&quot; para começar a prescrever treinos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <label className="block sm:max-w-sm">
          <span className={labelClass}>Aluno</span>
          <select
            value={student.id}
            onChange={(e) => onSelectStudent(e.target.value)}
            className={fieldClass}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <PrescriptionForm
        key={student.id}
        student={student}
        existingWorkout={workouts[student.id]}
        onSaveWorkout={onSaveWorkout}
      />
    </div>
  );
}

interface PrescriptionFormProps {
  student: MockStudent;
  existingWorkout: MockWorkoutDetail | undefined;
  onSaveWorkout: (studentId: string, workout: MockWorkoutDetail) => void;
}

function PrescriptionForm({ student, existingWorkout, onSaveWorkout }: PrescriptionFormProps) {
  const initial =
    existingWorkout ?? buildWorkoutDraft(student, student.discipline, formatDateLabel(todayIso()));

  const [scheduledDate, setScheduledDate] = useState(todayIso());
  const [discipline, setDiscipline] = useState(initial.discipline);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [prescription, setPrescription] = useState(initial.prescription);
  const [planned, setPlanned] = useState<PlannedMetrics>(initial.planned);
  const [structuredIntervals, setStructuredIntervals] = useState<WorkoutInterval[]>(
    initial.structuredIntervals
  );
  const [saved, setSaved] = useState(false);

  const isCycling = discipline === "Ciclismo";

  function handleDisciplineChange(next: string) {
    const template = templateForDiscipline(next);
    setDiscipline(next);
    setTitle(template.title);
    setDescription(template.description);
    setPrescription(template.prescription);
    setPlanned(template.planned);
    setStructuredIntervals(template.structuredIntervals);
    setSaved(false);
  }

  const draftWorkout: MockWorkoutDetail = {
    ...initial,
    title,
    discipline,
    scheduledDateLabel: formatDateLabel(scheduledDate),
    description,
    prescription,
    planned,
    structuredIntervals,
    status: "pending",
  };

  const whatsappLink = buildWhatsAppLink(student.phone, buildWorkoutWhatsAppMessage(draftWorkout));

  function handleSave() {
    onSaveWorkout(student.id, draftWorkout);
    setSaved(true);
  }

  return (
    <>
      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className={labelClass}>Título do treino</span>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaved(false);
              }}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Data do treino</span>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => {
                setScheduledDate(e.target.value);
                setSaved(false);
              }}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Modalidade</span>
            <select
              value={discipline}
              onChange={(e) => handleDisciplineChange(e.target.value)}
              className={fieldClass}
            >
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <WorkoutPrescriptionEditor
        description={description}
        prescription={prescription}
        planned={planned}
        onDescriptionChange={(value) => {
          setDescription(value);
          setSaved(false);
        }}
        onPrescriptionChange={(patch) => {
          setPrescription((prev) => ({ ...prev, ...patch }));
          setSaved(false);
        }}
        onPlannedChange={(patch) => {
          setPlanned((prev) => ({ ...prev, ...patch }));
          setSaved(false);
        }}
        onSave={handleSave}
        saved={saved}
      />

      {isCycling && (
        <Card>
          <CardTitle>Blocos por %FTP / zona</CardTitle>
          <p className="mt-1 text-xs text-g4-muted">
            Aquecimento, tiros, recuperação e desaquecimento — a mesma estrutura usada para gerar o
            arquivo .ZWO do aluno.
          </p>
          <IntervalEditor
            intervals={structuredIntervals}
            onChange={(next) => {
              setStructuredIntervals(next);
              setSaved(false);
            }}
          />
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Enviar prescrição</CardTitle>
            <p className="mt-1 text-xs text-g4-muted">
              Gera a mensagem formatada do treino de hoje para {student.name} ({student.phone}).
            </p>
          </div>
          <LinkButton
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            variant="primary"
            className="px-5"
          >
            Enviar via WhatsApp
          </LinkButton>
        </div>
      </Card>
    </>
  );
}
