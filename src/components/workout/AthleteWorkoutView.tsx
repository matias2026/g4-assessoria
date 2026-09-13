"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { StatusDot } from "@/components/ui/StatusDot";
import { AthleteTrainingSessions } from "@/components/workout/AthleteTrainingSessions";
import { CoachFeedbackCard } from "@/components/workout/CoachFeedbackCard";
import { DeviceTutorial } from "@/components/workout/DeviceTutorial";
import { DownloadFitButton } from "@/components/workout/DownloadFitButton";
import { DownloadZwoButton } from "@/components/workout/DownloadZwoButton";
import { RpeFeedbackModal, type RpeFeedback } from "@/components/workout/RpeFeedbackModal";
import { UploadFitButton } from "@/components/workout/UploadFitButton";
import { VideoEmbed } from "@/components/workout/VideoEmbed";
import { canExportStructuredWorkout } from "@/lib/workout-export";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { formatDistance, formatDuration } from "@/lib/workout-metrics";
import type { MockWorkoutDetail } from "@/lib/mock-data";
import { completeOwnWorkout } from "@/app/(athlete)/dashboard/profile-actions";

const GARMIN_CONNECT_URL = "https://connect.garmin.com/modern/";

interface AthleteWorkoutViewProps {
  workout: MockWorkoutDetail;
  // true na prévia do admin (buildExampleWorkout, sem linha própria em
  // `alunos`) — "Marcar como concluído"/upload de .FIT chamam
  // requireOwnAlunoId, que não acha ficha nenhuma pro admin e falha, então
  // essas ações ficam escondidas em vez de crashar ao clicar.
  isPreview?: boolean;
}

/**
 * Visão do atleta: Treino do Dia + Ações (exportar, concluir, tutorial de
 * dispositivo) + Feedback do Professor, tudo em um fluxo único — sem cards
 * soltos e desconectados.
 */
export function AthleteWorkoutView({ workout, isPreview = false }: AthleteWorkoutViewProps) {
  const [status, setStatus] = useState(workout.status);
  const [completed, setCompleted] = useState(workout.completed);
  const [modalOpen, setModalOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const stravaConnected = false; // TODO: ler de strava_tokens quando o Supabase estiver conectado

  const talkToCoachLink = buildWhatsAppLink(
    workout.coachPhone,
    `Oi ${workout.coachName}! Sobre o treino "${workout.title}" de hoje...`
  );

  // Grava no treino de hoje (concluido/rpe_esforco/sensacao/comentarios) —
  // sem isso, a conclusão só existia na tela do aluno, sumia ao recarregar
  // e o treinador nunca via nada na aba "Analisar treino do aluno".
  async function handleCompleteSubmit(feedback: RpeFeedback) {
    setCompleteError(null);
    setCompleting(true);
    try {
      await completeOwnWorkout(feedback);
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
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : "Não foi possível registrar a conclusão do treino.");
    } finally {
      setCompleting(false);
    }
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
        {/* Vídeo incorporado é uma experiência de Academia (exercícios com
            demonstração) — pra Ciclismo/Corrida o link de vídeo/preleção
            segue só na mensagem de WhatsApp, como já era antes. */}
        {workout.discipline === "Academia" && workout.prescription.videoUrl && (
          <VideoEmbed url={workout.prescription.videoUrl} />
        )}

        <div className="mt-3 flex items-center gap-4 text-sm text-g4-ink">
          <span>⏱ {formatDuration(workout.planned.durationSeconds)}</span>
          <span>📍 {formatDistance(workout.planned.distanceMeters)}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-t border-g4-border pt-3">
          <StatusDot status={status} />
          <div className="flex items-center gap-4 text-xs">
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

      <AthleteTrainingSessions sessions={workout.trainingSessions} />

      {/* Ações */}
      <Card>
        <CardTitle>Ações</CardTitle>
        <div className="mt-3 flex flex-col gap-4">
          {isPreview ? (
            <p className="rounded-xl border border-g4-border bg-g4-surface-alt p-3 text-sm text-g4-muted">
              Prévia — marcar como concluído e enviar arquivo .FIT ficam disponíveis só na conta de um aluno de
              verdade.
            </p>
          ) : (
            <>
              <Button variant="primary" onClick={() => setModalOpen(true)} disabled={status === "done"}>
                {status === "done" ? "Treino concluído ✓" : "Marcar como concluído"}
              </Button>

              {/* Sobe o .FIT gravado no relógio/ciclocomputador — vira o
                  gráfico de potência/FC/cadência real na análise do
                  treinador, em vez do RPE manual sozinho. */}
              <UploadFitButton onUploaded={() => setStatus("done")} />
            </>
          )}

          {canExportStructuredWorkout(workout) && (
            <div className="grid grid-cols-2 gap-4">
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
        submitting={completing}
        error={completeError}
      />
    </div>
  );
}
