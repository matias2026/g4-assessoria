import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { StatusDot } from "@/components/ui/StatusDot";
import { CoachFeedbackCard } from "@/components/workout/CoachFeedbackCard";
import { DeviceTutorial } from "@/components/workout/DeviceTutorial";
import { DownloadZwoButton } from "@/components/workout/DownloadZwoButton";
import { canExportZwo } from "@/lib/workout-export";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { formatDistance, formatDuration } from "@/lib/workout-metrics";
import type { MockWorkoutDetail } from "@/lib/mock-data";

const GARMIN_CONNECT_URL = "https://connect.garmin.com/modern/";

interface AthleteWorkoutViewProps {
  workout: MockWorkoutDetail;
}

/**
 * Visão do atleta: extremamente simples, em 3 blocos — Treino do Dia,
 * Botões de Ação e Feedback do Professor. Nada de tabelas densas ou
 * gráficos aqui; isso fica só no Cockpit do treinador.
 */
export function AthleteWorkoutView({ workout }: AthleteWorkoutViewProps) {
  const talkToCoachLink = buildWhatsAppLink(
    workout.coachPhone,
    `Oi ${workout.coachName}! Sobre o treino "${workout.title}" de hoje...`
  );

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

        <div className="mt-3">
          <StatusDot status={workout.status} />
        </div>
      </Card>

      {/* Botões de ação */}
      <Card>
        <CardTitle>Ações</CardTitle>
        <div className="mt-3 flex flex-col gap-2">
          <Button variant="primary">Marcar como concluído</Button>

          {canExportZwo(workout) && (
            <DownloadZwoButton
              title={workout.title}
              discipline={workout.discipline}
              structuredIntervals={workout.structuredIntervals}
            />
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
      <CoachFeedbackCard completed={workout.completed} coachName={workout.coachName} />
    </div>
  );
}
