"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { IntervalEditor } from "@/components/workout/IntervalEditor";
import { ExercisePrescriptionEditor } from "@/components/workout/ExercisePrescriptionEditor";
import { WorkoutPrescriptionEditor, type PlannedMetrics } from "@/components/workout/WorkoutPrescriptionEditor";
import { buildWhatsAppLink, buildWorkoutWhatsAppMessage } from "@/lib/whatsapp";
import {
  buildWorkoutDraft,
  defaultIntervalsForDiscipline,
  defaultTrainingSessionsForDiscipline,
  templateForDiscipline,
} from "@/lib/mock-data";
import type { MockStudent, MockWorkoutDetail } from "@/lib/mock-data";
import type { ExerciseLibraryItem, SetPreset, TrainingSession, WorkoutInterval } from "@/lib/supabase/types";
import { saveExerciseLibraryItem } from "@/app/(coach)/cockpit/actions";

interface PrescribeTabProps {
  students: MockStudent[];
  workouts: Record<string, MockWorkoutDetail>;
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  onSaveWorkout: (studentId: string, dateIso: string, workout: MockWorkoutDetail) => Promise<void>;
  onSendWorkout: (studentId: string, dateIso: string, workout: MockWorkoutDetail) => Promise<void>;
  initialExerciseLibrary: ExerciseLibraryItem[];
}

const DISCIPLINES = ["Ciclismo", "Corrida", "Academia"];

// Títulos pré-estabelecidos por modalidade — evita treino de corrida
// aparecendo prescrito para um aluno de ciclismo (ou vice-versa). O treinador
// ainda pode trocar a modalidade manualmente (ex.: aluno com Ciclismo de
// manhã + Academia à tarde), e a lista de títulos acompanha a troca.
const WORKOUT_TITLES: Record<string, string[]> = {
  Ciclismo: [
    "Intervalado de limiar",
    "Rodagem longa em Z2",
    "Tiros de VO2max",
    "Treino de força em Z3 (subida)",
    "Recuperação ativa",
  ],
  Corrida: [
    "Rodagem longa com progressão",
    "Tiros de velocidade",
    "Fartlek",
    "Rodagem regenerativa",
    "Treino de ritmo de prova",
  ],
  Academia: [
    "Treino de força — membros inferiores",
    "Treino de força — membros superiores",
    "Treino de core e estabilidade",
    "Treino funcional / circuito",
  ],
};

const fieldClass =
  "mt-1 w-full rounded-xl border border-g4-border bg-g4-surface p-2.5 text-sm text-g4-ink focus-ring";
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
  onSendWorkout,
  initialExerciseLibrary,
}: PrescribeTabProps) {
  const student = students.find((s) => s.id === selectedStudentId) ?? students[0];

  // Presets de série (Academia) ficam no nível da aba, não do formulário —
  // o formulário remonta a cada troca de aluno (via `key`), mas os presets
  // que o treinador salva devem continuar disponíveis para os outros alunos.
  const [presets, setPresets] = useState<SetPreset[]>([]);
  // Biblioteca de exercícios: mesmo raciocínio dos presets (sobrevive à
  // troca de aluno), mas com persistência real — salva na tabela
  // exercise_library via Server Action, não só em memória.
  const [library, setLibrary] = useState<ExerciseLibraryItem[]>(initialExerciseLibrary);

  async function handleSaveToLibrary(input: { name: string; videoUrl: string | null }) {
    const saved = await saveExerciseLibraryItem(input);
    setLibrary((prev) => {
      const exists = prev.some((item) => item.id === saved.id);
      return exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved];
    });
  }

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
        onSendWorkout={onSendWorkout}
        presets={presets}
        onPresetsChange={setPresets}
        library={library}
        onSaveToLibrary={handleSaveToLibrary}
      />
    </div>
  );
}

interface PrescriptionFormProps {
  student: MockStudent;
  existingWorkout: MockWorkoutDetail | undefined;
  onSaveWorkout: (studentId: string, dateIso: string, workout: MockWorkoutDetail) => Promise<void>;
  onSendWorkout: (studentId: string, dateIso: string, workout: MockWorkoutDetail) => Promise<void>;
  presets: SetPreset[];
  onPresetsChange: (presets: SetPreset[]) => void;
  library: ExerciseLibraryItem[];
  onSaveToLibrary: (input: { name: string; videoUrl: string | null }) => Promise<void>;
}

function PrescriptionForm({
  student,
  existingWorkout,
  onSaveWorkout,
  onSendWorkout,
  presets,
  onPresetsChange,
  library,
  onSaveToLibrary,
}: PrescriptionFormProps) {
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
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>(initial.trainingSessions);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Qualquer edição depois de salvar/enviar invalida os dois selos — o
  // treinador precisa salvar/enviar de novo pra refletir a mudança.
  function markDirty() {
    setSaved(false);
    setSent(false);
  }
  // Título livre em vez do dropdown de títulos prontos — reabrir um treino
  // que já tinha título fora da lista mantém o modo manual.
  const [manualTitle, setManualTitle] = useState(
    () => !WORKOUT_TITLES[initial.discipline]?.includes(initial.title)
  );

  const isCycling = discipline === "Ciclismo";
  const isAcademia = discipline === "Academia";

  // Recarrega descrição/prescrição/métricas planejadas/blocos/exercícios a
  // partir do modelo pronto da modalidade — usado tanto ao trocar de
  // modalidade quanto ao voltar do título manual para a lista.
  function applyTemplate(nextDiscipline: string) {
    const template = templateForDiscipline(nextDiscipline);
    setDescription(template.description);
    setPrescription(template.prescription);
    setPlanned(template.planned);
    setStructuredIntervals(defaultIntervalsForDiscipline(nextDiscipline));
    setTrainingSessions(defaultTrainingSessionsForDiscipline(nextDiscipline));
  }

  function handleDisciplineChange(next: string) {
    setDiscipline(next);
    setTitle(WORKOUT_TITLES[next][0]);
    setManualTitle(false);
    applyTemplate(next);
    markDirty();
  }

  // "Criar treino manual": título vira texto livre e todos os campos da
  // modalidade voltam a um ponto de partida em branco, pro treinador
  // montar o treino do zero (em vez de partir do modelo pronto).
  function startManualTitle() {
    setManualTitle(true);
    setTitle("");
    setDescription("");
    setPrescription({ warmup: "", mainSet: "", cooldown: "", videoUrl: null });
    setPlanned({
      durationSeconds: null,
      distanceMeters: null,
      tss: null,
      ifScore: null,
      hrMin: null,
      hrAvg: null,
      hrMax: null,
    });
    setStructuredIntervals(defaultIntervalsForDiscipline(discipline));
    setTrainingSessions(defaultTrainingSessionsForDiscipline(discipline));
    markDirty();
  }

  // Reversível: volta pra lista de títulos prontos e recarrega o modelo da
  // modalidade atual (mesmo efeito de trocar a modalidade, sem trocá-la).
  function usePresetTitle() {
    setManualTitle(false);
    setTitle(WORKOUT_TITLES[discipline][0]);
    applyTemplate(discipline);
    markDirty();
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
    trainingSessions,
    status: "pending",
  };

  const whatsappLink = buildWhatsAppLink(student.phone, buildWorkoutWhatsAppMessage(draftWorkout));

  async function handleSave() {
    setSaveError(null);
    setSubmitting(true);
    try {
      await onSaveWorkout(student.id, scheduledDate, draftWorkout);
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Não foi possível salvar a prescrição.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSend() {
    setSendError(null);
    setSending(true);
    try {
      await onSendWorkout(student.id, scheduledDate, draftWorkout);
      setSent(true);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Não foi possível enviar o treino.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <div className="flex items-center justify-between gap-4">
              <span className={labelClass}>Título do treino</span>
              <button
                type="button"
                onClick={manualTitle ? usePresetTitle : startManualTitle}
                className="text-xs font-medium text-lime-deep hover:underline"
              >
                {manualTitle ? "Usar título da lista" : "Criar treino manual"}
              </button>
            </div>
            {manualTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
                placeholder="Digite o título do treino"
                className={fieldClass}
              />
            ) : (
              <select
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
                className={fieldClass}
              >
                {WORKOUT_TITLES[discipline].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="block">
            <span className={labelClass}>Data do treino</span>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => {
                setScheduledDate(e.target.value);
                markDirty();
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
          markDirty();
        }}
        onPrescriptionChange={(patch) => {
          setPrescription((prev) => ({ ...prev, ...patch }));
          markDirty();
        }}
        onPlannedChange={(patch) => {
          setPlanned((prev) => ({ ...prev, ...patch }));
          markDirty();
        }}
        onSave={handleSave}
        saved={saved}
        submitting={submitting}
        error={saveError}
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
              markDirty();
            }}
          />
        </Card>
      )}

      {isAcademia && (
        <Card>
          <CardTitle>Treinos e exercícios</CardTitle>
          <p className="mt-1 text-xs text-g4-muted">
            Monte um ou mais treinos nomeados (ex.: &quot;Treino 1&quot;, &quot;Treino 2&quot;), cada um
            com seus exercícios, vídeo demonstrativo e séries.
          </p>
          <ExercisePrescriptionEditor
            sessions={trainingSessions}
            onChange={(next) => {
              setTrainingSessions(next);
              markDirty();
            }}
            presets={presets}
            onPresetsChange={onPresetsChange}
            library={library}
            onSaveToLibrary={onSaveToLibrary}
          />
        </Card>
      )}

      <Card>
        <CardTitle>Enviar prescrição</CardTitle>
        <p className="mt-1 text-xs text-g4-muted">
          &quot;Enviar treino&quot; publica pro painel de {student.name} — antes disso, o que está sendo
          montado aqui é só um rascunho que ninguém além de você vê.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Button variant="primary" className="px-5" onClick={handleSend} disabled={sending}>
            {sending ? "Enviando..." : sent ? "Enviado ✓" : "Enviar treino"}
          </Button>
          <LinkButton href={whatsappLink} target="_blank" rel="noreferrer" variant="secondary" className="px-5">
            Enviar via WhatsApp
          </LinkButton>
        </div>
        {sendError && <p className="mt-2 text-sm text-status-missed">{sendError}</p>}
      </Card>
    </>
  );
}
