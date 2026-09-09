import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { StatusDot } from "@/components/ui/StatusDot";
import { AiFeedbackComposer } from "@/components/workout/AiFeedbackComposer";
import { PlannedVsCompleted } from "@/components/workout/PlannedVsCompleted";
import { WorkoutPrescription } from "@/components/workout/WorkoutPrescription";
import { ZonesChart } from "@/components/workout/ZonesChart";
import { buildWhatsAppLink, buildWorkoutWhatsAppMessage } from "@/lib/whatsapp";
import type { MockWorkoutDetail } from "@/lib/mock-data";
import type { FeedbackDraftInput } from "@/lib/ai/gemini";

interface CoachWorkoutViewProps {
  workout: MockWorkoutDetail;
}

/**
 * Visão do treinador: painel completo e analítico (Planejado vs. Concluído,
 * TSS/IF, zonas de potência/FC) — mantém toda a densidade que a visão do
 * atleta abandona.
 */
export function CoachWorkoutView({ workout }: CoachWorkoutViewProps) {
  const sendToAthleteLink = buildWhatsAppLink(workout.athletePhone, buildWorkoutWhatsAppMessage(workout));

  const draftInput: FeedbackDraftInput = {
    athleteName: workout.athleteName,
    workoutTitle: workout.title,
    discipline: workout.discipline,
    planned: workout.planned,
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

      <WorkoutPrescription prescription={workout.prescription} />
      <PlannedVsCompleted
        discipline={workout.discipline}
        planned={workout.planned}
        completed={workout.completed}
      />
      {workout.powerZones.length > 0 && (
        <ZonesChart title="Zonas de potência" data={workout.powerZones} />
      )}
      <AiFeedbackComposer
        draftInput={draftInput}
        initialValue={workout.completed?.coachFeedback ?? workout.completed?.aiFeedbackDraft ?? ""}
      />
    </div>
  );
}
