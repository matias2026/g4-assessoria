"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { StatusDot } from "@/components/ui/StatusDot";
import { AiFeedbackComposer } from "@/components/workout/AiFeedbackComposer";
import { PlannedVsCompleted } from "@/components/workout/PlannedVsCompleted";
import { WorkoutPrescriptionEditor, type PlannedMetrics } from "@/components/workout/WorkoutPrescriptionEditor";
import { ZonesChart } from "@/components/workout/ZonesChart";
import { buildWhatsAppLink, buildWorkoutWhatsAppMessage } from "@/lib/whatsapp";
import type { MockWorkoutDetail } from "@/lib/mock-data";
import type { FeedbackDraftInput } from "@/lib/ai/gemini";

interface CoachWorkoutViewProps {
  workout: MockWorkoutDetail;
}

/**
 * Visão do treinador: painel completo e analítico. O treinador edita a
 * prescrição (descrição, blocos, vídeo, métricas planejadas) e vê o
 * comparativo com o Concluído, as zonas de potência/FC e o composer de
 * feedback com IA — tudo para o aluno selecionado (via navegação a partir
 * da listagem do cockpit). TODO: persistir as edições em workouts via
 * Supabase quando o projeto estiver conectado.
 */
export function CoachWorkoutView({ workout }: CoachWorkoutViewProps) {
  const [description, setDescription] = useState(workout.description);
  const [prescription, setPrescription] = useState(workout.prescription);
  const [planned, setPlanned] = useState<PlannedMetrics>(workout.planned);
  const [saved, setSaved] = useState(false);

  const currentWorkout: MockWorkoutDetail = { ...workout, description, prescription, planned };
  const sendToAthleteLink = buildWhatsAppLink(
    workout.athletePhone,
    buildWorkoutWhatsAppMessage(currentWorkout)
  );

  const draftInput: FeedbackDraftInput = {
    athleteName: workout.athleteName,
    workoutTitle: workout.title,
    discipline: workout.discipline,
    planned,
    completed: {
      durationSeconds: workout.completed?.durationSeconds ?? null,
      tss: workout.completed?.tss ?? null,
      ifScore: workout.completed?.ifScore ?? null,
      hrAvg: workout.completed?.hrAvg ?? null,
      rpe: workout.completed?.rpe ?? null,
      feeling: workout.completed?.feeling ?? null,
      athleteComments: workout.completed?.comments ?? null,
    },
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="lime">{workout.discipline}</Badge>
            <span className="text-sm text-g4-muted">{workout.scheduledDateLabel}</span>
          </div>

          <LinkButton href={sendToAthleteLink} target="_blank" rel="noreferrer" variant="secondary" className="px-4">
            Enviar via WhatsApp
          </LinkButton>
        </div>

        <h1 className="mt-2 text-2xl font-bold text-g4-ink">{workout.title}</h1>
        <p className="text-sm text-g4-muted">{workout.athleteName}</p>

        <div className="mt-2">
          <StatusDot status={workout.status} />
        </div>
      </header>

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
        onSave={() => setSaved(true)}
        saved={saved}
      />

      <PlannedVsCompleted discipline={workout.discipline} planned={planned} completed={workout.completed} />

      {workout.powerZones.length > 0 && <ZonesChart title="Zonas de potência" data={workout.powerZones} />}

      <AiFeedbackComposer
        draftInput={draftInput}
        initialValue={workout.completed?.coachFeedback ?? workout.completed?.aiFeedbackDraft ?? ""}
      />
    </div>
  );
}
