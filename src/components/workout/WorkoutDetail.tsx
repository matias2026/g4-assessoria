import { Badge } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import { PlannedVsCompleted } from "@/components/workout/PlannedVsCompleted";
import { WorkoutPrescription } from "@/components/workout/WorkoutPrescription";
import { SubjectiveFeedback } from "@/components/workout/SubjectiveFeedback";
import type { MockWorkoutDetail } from "@/lib/mock-data";

interface WorkoutDetailProps {
  workout: MockWorkoutDetail;
  // O cockpit do treinador mostra o nome do atleta; a Home do atleta não precisa.
  showAthleteName?: boolean;
}

// Tela de detalhes do treino compartilhada entre a visão do atleta e o
// cockpit do treinador: prescrição estruturada, comparação Planejado vs.
// Concluído e feedback subjetivo pós-treino.
export function WorkoutDetail({ workout, showAthleteName = false }: WorkoutDetailProps) {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="lime">{workout.discipline}</Badge>
          <span className="text-sm text-g4-muted">{workout.scheduledDateLabel}</span>
        </div>

        <h1 className="mt-2 text-2xl font-bold text-g4-ink">{workout.title}</h1>
        {showAthleteName && <p className="text-sm text-g4-muted">{workout.athleteName}</p>}

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
      <SubjectiveFeedback completed={workout.completed} />
    </div>
  );
}
