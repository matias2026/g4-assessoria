"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { StatusDot } from "@/components/ui/StatusDot";
import { AiFeedbackComposer } from "@/components/workout/AiFeedbackComposer";
import { IntervalEditor } from "@/components/workout/IntervalEditor";
import { PlannedVsCompleted } from "@/components/workout/PlannedVsCompleted";
import { WorkoutPrescriptionEditor, type PlannedMetrics } from "@/components/workout/WorkoutPrescriptionEditor";
import { ZonesChart } from "@/components/workout/ZonesChart";
import { buildWhatsAppLink, buildWorkoutWhatsAppMessage } from "@/lib/whatsapp";
import type { MockWorkoutDetail } from "@/lib/mock-data";
import type { WorkoutInterval } from "@/lib/supabase/types";
import type { FeedbackDraftInput } from "@/lib/ai/gemini";

interface CoachWorkoutViewProps {
  workout: MockWorkoutDetail;
}

/**
 * Visão do treinador: painel completo e analítico. O treinador edita a
 * prescrição (descrição, blocos, vídeo, métricas planejadas, intervalos por
 * %FTP) e vê o comparativo com o Concluído, as zonas de potência/FC e o
 * composer de feedback com IA — tudo para o aluno selecionado (via
 * navegação a partir da listagem do cockpit). TODO: persistir as edições em
 * workouts via Supabase quando o projeto estiver conectado.
 */
export function CoachWorkoutView({ workout }: CoachWorkoutViewProps) {
  const [description, setDescription] = useState(workout.description);
  const [prescription, setPrescription] = useState(workout.prescription);
  const [planned, setPlanned] = useState<PlannedMetrics>(workout.planned);
  const [structuredIntervals, setStructuredIntervals] = useState<WorkoutInterval[]>(
    workout.structuredIntervals
  );
  const [saved, setSaved] = useState(false);

  const isCycling = workout.discipline.toLowerCase().includes("ciclismo");

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
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={workout.athleteName} className="h-12 w-12 text-lg" />
            <div>
              <p className="text-lg font-bold text-g4-ink">{workout.athleteName}</p>
              <p className="text-sm text-g4-muted">{workout.athletePhone}</p>
            </div>
          </div>

          <LinkButton href={sendToAthleteLink} target="_blank" rel="noreferrer" variant="primary" className="px-4">
            Enviar via WhatsApp
          </LinkButton>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-g4-border pt-4">
          <Badge tone="lime">{workout.discipline}</Badge>
          <span className="text-sm text-g4-muted">{workout.scheduledDateLabel}</span>
          <StatusDot status={workout.status} className="ml-auto" />
        </div>

        <h1 className="mt-3 text-2xl font-bold text-g4-ink">{workout.title}</h1>
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
        onSave={() => setSaved(true)}
        saved={saved}
      />

      {isCycling && (
        <Card>
          <CardTitle>Blocos por %FTP / zona</CardTitle>
          <p className="mt-1 text-xs text-g4-muted">
            Aquecimento, tiros, recuperação e desaquecimento — a mesma estrutura usada para
            gerar o arquivo .ZWO do aluno.
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

      <PlannedVsCompleted discipline={workout.discipline} planned={planned} completed={workout.completed} />

      {workout.powerZones.length > 0 && <ZonesChart title="Zonas de potência" data={workout.powerZones} />}

      <AiFeedbackComposer
        draftInput={draftInput}
        initialValue={workout.completed?.coachFeedback ?? workout.completed?.aiFeedbackDraft ?? ""}
      />
    </div>
  );
}
