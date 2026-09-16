"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { StepProgress } from "@/components/ui/StepProgress";
import { IntervalEditor } from "@/components/workout/IntervalEditor";
import { ExercisePrescriptionEditor } from "@/components/workout/ExercisePrescriptionEditor";
import { WorkoutDescriptionFields, PlannedMetricsFields, type PlannedMetrics } from "@/components/workout/WorkoutPrescriptionEditor";
import { buildWhatsAppLink, buildWorkoutWhatsAppMessage } from "@/lib/whatsapp";
import { blankPrescriptionFields, buildWorkoutDraft } from "@/lib/mock-data";
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
  // Treino escolhido na aba "Treinos cadastrados" via "Usar para outro
  // aluno" — só o conteúdo (título/descrição/blocos) é reaproveitado, as
  // métricas do aluno (FC, id, nome) vêm sempre do aluno selecionado aqui.
  template?: MockWorkoutDetail | null;
  onClearTemplate?: () => void;
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

// Só o conteúdo do treino (não a identidade do aluno original) sobrevive
// ao virar modelo para outro aluno — status/completed/powerZones etc. vêm
// sempre de buildWorkoutDraft do aluno atual.
function pickTemplateContent(template: MockWorkoutDetail) {
  return {
    title: template.title,
    description: template.description,
    prescription: template.prescription,
    planned: template.planned,
    structuredIntervals: template.structuredIntervals,
    trainingSessions: template.trainingSessions,
  };
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

type StepKey = "info" | "descricao" | "metricas" | "blocos" | "testar" | "enviar";

interface Step {
  key: StepKey;
  label: string;
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
  template = null,
  onClearTemplate,
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

      {template && (
        <Card className="border-lime-deep/40 bg-lime-400/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-g4-ink">
              Usando <span className="font-semibold">&quot;{template.title}&quot;</span> como modelo — escolha o
              aluno acima, edite o que for necessário e envie.
            </p>
            {onClearTemplate && (
              <button
                type="button"
                onClick={onClearTemplate}
                className="shrink-0 text-xs font-semibold text-lime-deep hover:underline"
              >
                Sair do modelo
              </button>
            )}
          </div>
        </Card>
      )}

      <PrescriptionForm
        key={`${student.id}:${template ? `template-${template.id}-${template.title}` : "own"}`}
        student={student}
        existingWorkout={workouts[student.id]}
        template={template}
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
  template: MockWorkoutDetail | null;
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
  template,
  onSaveWorkout,
  onSendWorkout,
  presets,
  onPresetsChange,
  library,
  onSaveToLibrary,
}: PrescriptionFormProps) {
  // Identidade (id/nome/telefone do treinador etc.) sempre vem do aluno
  // selecionado, nunca do treino de origem — só o conteúdo (título,
  // descrição, blocos, métricas planejadas) é reaproveitado do modelo.
  const initial = template
    ? { ...buildWorkoutDraft(student, template.discipline, formatDateLabel(todayIso())), ...pickTemplateContent(template) }
    : existingWorkout ?? buildWorkoutDraft(student, student.discipline, formatDateLabel(todayIso()));

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
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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
  const isRunning = discipline === "Corrida";
  const isAcademia = discipline === "Academia";

  // Assistente em passos (um card só, um passo por vez, com Voltar/Avançar)
  // em vez de todas as seções empilhadas — os passos mudam com a
  // modalidade (blocos por FC/potência pra Ciclismo/Corrida, exercícios
  // pra Academia) e com ter ou não blocos pra testar no dispositivo.
  const steps: Step[] = [
    { key: "info", label: "Treino e modalidade" },
    { key: "descricao", label: "Descrição do treino" },
    { key: "metricas", label: "Métricas planejadas" },
  ];
  if (isCycling || isRunning) steps.push({ key: "blocos", label: "Definir treino por blocos" });
  if (isAcademia) steps.push({ key: "blocos", label: "Treinos e exercícios" });
  if ((isCycling || isRunning) && structuredIntervals.length > 0) {
    steps.push({ key: "testar", label: "Testar no dispositivo" });
  }
  steps.push({ key: "enviar", label: "Enviar prescrição" });

  const [rawStep, setStep] = useState(0);
  const stepIndex = Math.min(rawStep, steps.length - 1);
  const currentStep = steps[stepIndex];

  function goNext() {
    setStep((s) => Math.min(steps.length - 1, s + 1));
  }
  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  // Zera descrição/prescrição/métricas planejadas/blocos/exercícios — usado
  // tanto ao trocar de modalidade quanto ao voltar do título manual para a
  // lista. Nunca puxa o conteúdo de exemplo de TEMPLATE_CICLISMO/CORRIDA/
  // ACADEMIA: um título pronto (ex. "Rodagem longa em Z2") é só um rótulo
  // pra agilizar o cadastro, não uma prescrição real — o treinador escreve
  // cada uma do zero, senão a tela mostraria o texto de outro treino.
  function applyBlankFields(nextDiscipline: string) {
    const blank = blankPrescriptionFields(nextDiscipline);
    setDescription(blank.description);
    setPrescription(blank.prescription);
    setPlanned(blank.planned);
    setStructuredIntervals(blank.structuredIntervals);
    setTrainingSessions(blank.trainingSessions);
  }

  function handleDisciplineChange(next: string) {
    setDiscipline(next);
    setTitle(WORKOUT_TITLES[next][0]);
    setManualTitle(false);
    applyBlankFields(next);
    markDirty();
  }

  // "Criar treino manual": título vira texto livre; os campos da modalidade
  // já ficam em branco de qualquer forma (applyBlankFields), só o título é
  // diferente do caminho normal.
  function startManualTitle() {
    setManualTitle(true);
    setTitle("");
    applyBlankFields(discipline);
    markDirty();
  }

  // Reversível: volta pra lista de títulos prontos, com os campos em branco
  // (mesmo efeito de trocar a modalidade, sem trocá-la).
  function usePresetTitle() {
    setManualTitle(false);
    setTitle(WORKOUT_TITLES[discipline][0]);
    applyBlankFields(discipline);
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

  const hrRest = student.cycling?.hrRest ?? student.running?.hrRest ?? null;
  const hrMax = student.cycling?.hrMax ?? student.running?.hrMax ?? null;

  const whatsappLink = buildWhatsAppLink(student.phone, buildWorkoutWhatsAppMessage(draftWorkout, hrRest, hrMax));

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

  // Baixa o .FIT gerado a partir dos blocos atuais pro treinador testar num
  // dispositivo de verdade (cabo USB) antes de enviar pro aluno — import
  // sob demanda porque o SDK da Garmin só roda no navegador e não precisa
  // entrar no bundle inicial do Cockpit.
  async function handleTestDownload() {
    setExportError(null);
    setExporting(true);
    try {
      const { buildFitWorkout } = await import("@/lib/workout-export");
      const bytes = buildFitWorkout({ title, discipline, structuredIntervals });
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(title || "treino").replace(/[^a-z0-9]+/gi, "-")}.fit`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Não foi possível gerar o arquivo .FIT.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <StepProgress current={stepIndex + 1} total={steps.length} label={currentStep.label} />

      <div className="mt-4 flex flex-col gap-4">
        {currentStep.key === "info" && (
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
                    // Trocar de título é trocar de prescrição — sem isso, a
                    // tela ficava com a descrição/blocos do título anterior
                    // ainda preenchidos, como se fossem do novo.
                    applyBlankFields(discipline);
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
        )}

        {currentStep.key === "descricao" && (
          <WorkoutDescriptionFields
            description={description}
            prescription={prescription}
            onDescriptionChange={(value) => {
              setDescription(value);
              markDirty();
            }}
            onPrescriptionChange={(patch) => {
              setPrescription((prev) => ({ ...prev, ...patch }));
              markDirty();
            }}
            hrRest={hrRest}
            hrMax={hrMax}
          />
        )}

        {currentStep.key === "metricas" && (
          <PlannedMetricsFields
            planned={planned}
            onPlannedChange={(patch) => {
              setPlanned((prev) => ({ ...prev, ...patch }));
              markDirty();
            }}
          />
        )}

        {currentStep.key === "blocos" && (isCycling || isRunning) && (
          <>
            <p className="text-xs text-g4-muted">
              Aquecimento, tiros, recuperação e desaquecimento — cada bloco pode combinar Potência, Frequência
              cardíaca e Cadência ao mesmo tempo (ex.: &quot;sprint a 180bpm com cadência a 100rpm&quot;).
            </p>
            <IntervalEditor
              intervals={structuredIntervals}
              onChange={(next) => {
                setStructuredIntervals(next);
                markDirty();
              }}
              showPower={isCycling}
              hrMax={hrMax}
              hrRest={hrRest}
            />
          </>
        )}

        {currentStep.key === "blocos" && isAcademia && (
          <>
            <p className="text-xs text-g4-muted">
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
          </>
        )}

        {currentStep.key === "testar" && (
          <>
            <p className="text-xs text-g4-muted">
              Baixa um .FIT com os blocos definidos, pra você mesmo carregar num relógio/ciclocomputador via
              cabo USB e conferir se o treino ficou do jeito que foi montado — antes de enviar pro aluno.
            </p>
            <Button variant="secondary" className="self-start px-5" onClick={handleTestDownload} disabled={exporting}>
              {exporting ? "Gerando..." : "Baixar .FIT de teste"}
            </Button>
            {exportError && <p className="text-sm text-status-missed">{exportError}</p>}
          </>
        )}

        {currentStep.key === "enviar" && (
          <>
            <p className="text-xs text-g4-muted">
              &quot;Enviar treino&quot; publica pro painel de {student.name} — antes disso, o que está sendo
              montado é só um rascunho que ninguém além de você vê. &quot;Salvar prescrição&quot; guarda o
              rascunho sem publicar ainda.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="secondary" className="px-5" onClick={handleSave} disabled={submitting}>
                {submitting ? "Salvando..." : saved ? "Salvo ✓" : "Salvar prescrição"}
              </Button>
              <Button variant="primary" className="px-5" onClick={handleSend} disabled={sending}>
                {sending ? "Enviando..." : sent ? "Enviado ✓" : "Enviar treino"}
              </Button>
              <LinkButton href={whatsappLink} target="_blank" rel="noreferrer" variant="secondary" className="px-5">
                Enviar via WhatsApp
              </LinkButton>
            </div>
            {saveError && <p className="text-sm text-status-missed">{saveError}</p>}
            {sendError && <p className="text-sm text-status-missed">{sendError}</p>}
          </>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-g4-border pt-4">
        <button
          type="button"
          onClick={goBack}
          disabled={stepIndex === 0}
          className="rounded-xl border border-g4-border px-4 py-2 text-sm font-semibold text-g4-ink focus-ring disabled:opacity-40"
        >
          ← Voltar
        </button>
        {stepIndex < steps.length - 1 && (
          <Button variant="primary" className="px-5" onClick={goNext}>
            Avançar →
          </Button>
        )}
      </div>
    </Card>
  );
}
