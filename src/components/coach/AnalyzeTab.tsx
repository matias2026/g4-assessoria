import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import { ActivityDetailView } from "@/components/workout/ActivityDetailView";
import { AiFeedbackComposer } from "@/components/workout/AiFeedbackComposer";
import { IntervalTimeline } from "@/components/coach/IntervalTimeline";
import { PlannedVsCompleted } from "@/components/workout/PlannedVsCompleted";
import { ZonesChart } from "@/components/workout/ZonesChart";
import { buildMockActivityDetail } from "@/lib/activity-detail";
import type { MockStudent, MockWorkoutDetail } from "@/lib/mock-data";
import type { FeedbackDraftInput } from "@/lib/ai/gemini";

interface AnalyzeTabProps {
  students: MockStudent[];
  workouts: Record<string, MockWorkoutDetail>;
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
}

const fieldClass =
  "mt-1 w-full rounded-xl border border-g4-border bg-white p-2.5 text-sm text-g4-ink focus-ring";
const labelClass = "text-xs font-medium text-g4-muted";

/**
 * Aba "Analisar treino do aluno": o painel analítico estilo TrainingPeaks —
 * Planejado vs. Concluído, gráfico de blocos, zonas de potência/FC e o
 * composer de feedback com IA.
 */
export function AnalyzeTab({ students, workouts, selectedStudentId, onSelectStudent }: AnalyzeTabProps) {
  const student = students.find((s) => s.id === selectedStudentId) ?? students[0];
  const workout = student ? workouts[student.id] : undefined;

  if (!student || !workout) {
    return (
      <p className="text-sm text-g4-muted">
        Prescreva um treino na aba &quot;Criar/Prescrever treino&quot; para liberar a análise.
      </p>
    );
  }

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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-g4-border pt-4">
          <div className="flex items-center gap-4">
            <Avatar name={workout.athleteName} className="h-11 w-11 text-base" />
            <div>
              <p className="font-bold text-g4-ink">{workout.athleteName}</p>
              <p className="text-xs text-g4-muted">{workout.athletePhone}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge tone="lime">{workout.discipline}</Badge>
            <span className="text-sm text-g4-muted">{workout.scheduledDateLabel}</span>
            <StatusDot status={workout.status} />
          </div>
        </div>

        <h2 className="mt-3 text-xl font-bold text-g4-ink">{workout.title}</h2>
      </Card>

      {/* TODO: substituir por amostras reais (FIT/Strava) quando a
          importação por segundo estiver disponível — hoje é sempre a
          mesma atividade de exemplo, independente do treino selecionado. */}
      {workout.completed && <ActivityDetailView activity={buildMockActivityDetail()} />}

      {workout.structuredIntervals.length > 0 && (
        <Card>
          <CardTitle>Gráfico de blocos</CardTitle>
          <div className="mt-3">
            <IntervalTimeline intervals={workout.structuredIntervals} />
          </div>
        </Card>
      )}

      <PlannedVsCompleted discipline={workout.discipline} planned={workout.planned} completed={workout.completed} />

      {workout.powerZones.length > 0 && <ZonesChart title="Zonas de potência" data={workout.powerZones} />}

      <AiFeedbackComposer
        draftInput={draftInput}
        initialValue={workout.completed?.coachFeedback ?? workout.completed?.aiFeedbackDraft ?? ""}
      />
    </div>
  );
}
