"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { StatusDot } from "@/components/ui/StatusDot";
import { CoachFeedbackCard } from "@/components/workout/CoachFeedbackCard";
import { DeviceTutorial } from "@/components/workout/DeviceTutorial";
import { DownloadFitButton } from "@/components/workout/DownloadFitButton";
import { DownloadZwoButton } from "@/components/workout/DownloadZwoButton";
import { RpeFeedbackModal, type RpeFeedback } from "@/components/workout/RpeFeedbackModal";
import { canExportStructuredWorkout } from "@/lib/workout-export";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { formatDistance, formatDuration } from "@/lib/workout-metrics";
import type { MockWorkoutDetail } from "@/lib/mock-data";

const GARMIN_CONNECT_URL = "https://connect.garmin.com/modern/";

interface AthleteWorkoutViewProps {
  workout: MockWorkoutDetail;
}

/**
 * Visão do atleta: Treino do Dia + Ações (exportar, concluir, tutorial de
 * dispositivo) + Feedback do Professor, tudo em um fluxo único — sem cards
 * soltos e desconectados. TODO: persistir a conclusão em workout_completions
 * via Supabase quando o projeto estiver conectado (hoje só atualiza a tela).
 */
export function AthleteWorkoutView({ workout }: AthleteWorkoutViewProps) {
  const [status, setStatus] = useState(workout.status);
  const [completed, setCompleted] = useState(workout.completed);
  const [modalOpen, setModalOpen] = useState(false);

  const stravaConnected = false; // TODO: ler de strava_tokens quando o Supabase estiver conectado

  const talkToCoachLink = buildWhatsAppLink(
    workout.coachPhone,
    `Oi ${workout.coachName}! Sobre o treino "${workout.title}" de hoje...`
  );

  function handleCompleteSubmit(feedback: RpeFeedback) {
    setStatus("done");
    setCompleted((prev) => ({
      source: "manual",
      durationSeconds: prev?.durationSeconds ?? null,
      distanceMeters: prev?.distanceMeters ?? null,
      tss: prev?.tss ?? null,
      ifScore: prev?.ifScore ?? null,
      hrMin: prev?.hrMin ?? null,
      hrAvg: prev?.hrAvg ?? null,
      hrMax: prev?.hrMax ?? null,
      rpe: feedback.rpe,
      feeling: feedback.feeling,
      comments: feedback.comments || null,
      aiFeedbackDraft: prev?.aiFeedbackDraft ?? null,
      coachFeedback: prev?.coachFeedback ?? null,
    }));
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Treino do dia */}
      <Card>
        <div className="flex items-center justify-between">
          <Badge tone="lime">{workout.discipline}</Badge>
          <span className="text-sm text-g4-muted">{workout.scheduledDateLabel}</span>
        </div>

        <h1 className="mt-2 text-xl font-bold text-g4-ink">{workout.title}</h1>
        <p className="mt-1 text-sm text-g4-muted">{workout.prescription.mainSet}</p>

        <div className="mt-3 flex items-center gap-4 text-sm text-g4-ink">
          <span>⏱ {formatDuration(workout.planned.durationSeconds)}</span>
          <span>📍 {formatDistance(workout.planned.distanceMeters)}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-g4-border pt-3">
          <StatusDot status={status} />
          <div className="flex items-center gap-1.5 text-xs">
            <Badge tone={stravaConnected ? "lime" : "neutral"}>
              {stravaConnected
                ? status === "done"
                  ? "Sincronizado via Strava"
                  : "Strava conectado"
                : "Strava não conectado"}
            </Badge>
            {!stravaConnected && (
              <LinkButton href="/api/strava/connect" variant="ghost" className="px-2 py-1 text-xs">
                Conectar
              </LinkButton>
            )}
          </div>
        </div>
      </Card>

      {/* Ações */}
      <Card>
        <CardTitle>Ações</CardTitle>
        <div className="mt-3 flex flex-col gap-2">
          <Button variant="primary" onClick={() => setModalOpen(true)} disabled={status === "done"}>
            {status === "done" ? "Treino concluído ✓" : "Marcar como concluído"}
          </Button>

          {canExportStructuredWorkout(workout) && (
            <div className="grid grid-cols-2 gap-2">
              <DownloadFitButton
                title={workout.title}
                discipline={workout.discipline}
                structuredIntervals={workout.structuredIntervals}
              />
              <DownloadZwoButton
                title={workout.title}
                discipline={workout.discipline}
                structuredIntervals={workout.structuredIntervals}
              />
            </div>
          )}

          <LinkButton href={GARMIN_CONNECT_URL} target="_blank" rel="noreferrer" variant="secondary">
            Abrir no Garmin Connect
          </LinkButton>

          <LinkButton href={talkToCoachLink} target="_blank" rel="noreferrer" variant="ghost">
            💬 Falar com {workout.coachName} no WhatsApp
          </LinkButton>
        </div>

        <DeviceTutorial />
      </Card>

      {/* Feedback do professor (híbrido: treinador + apoio de IA) + RPE */}
      <CoachFeedbackCard completed={completed} coachName={workout.coachName} />

      <RpeFeedbackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCompleteSubmit}
      />
    </div>
  );
}
