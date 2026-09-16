import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import type { MockStudent, MockWorkoutDetail } from "@/lib/mock-data";

interface PrescribedWorkoutsTabProps {
  students: MockStudent[];
  workouts: Record<string, MockWorkoutDetail>;
  // Abre esse treino (do mesmo aluno) na aba Prescrever, pra editar/reenviar.
  onOpenInPrescribe: (studentId: string) => void;
  // Reaproveita o conteúdo desse treino como modelo pra prescrever pra
  // outro aluno — o treinador escolhe quem na própria aba Prescrever.
  onUseAsTemplate: (workout: MockWorkoutDetail) => void;
  onViewAnalysis: (studentId: string) => void;
}

function hasVideo(workout: MockWorkoutDetail): boolean {
  if (workout.prescription.videoUrl) return true;
  return workout.trainingSessions.some((session) => session.exercises.some((exercise) => exercise.videoUrl));
}

const actionLinkClass = "text-xs font-semibold text-lime-deep hover:underline focus-ring rounded";

/**
 * Aba "Treinos cadastrados": visão geral dos treinos já enviados pra
 * hoje, por aluno — sem precisar entrar aluno por aluno na aba
 * "Analisar". Cada treino tem 3 ações: abrir na aba Prescrever pra
 * editar/reenviar pro mesmo aluno, reaproveitar como modelo pra outro
 * aluno (mesma prescrição, aluno diferente), ou ver a análise do dia.
 * `workouts` chega do banco (listTodayWorkouts) e é atualizado na hora
 * quando o treinador prescreve/envia dentro da mesma sessão.
 */
export function PrescribedWorkoutsTab({
  students,
  workouts,
  onOpenInPrescribe,
  onUseAsTemplate,
  onViewAnalysis,
}: PrescribedWorkoutsTabProps) {
  const rows = students
    .map((student) => ({ student, workout: workouts[student.id] }))
    .filter((row): row is { student: MockStudent; workout: MockWorkoutDetail } => Boolean(row.workout));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-g4-ink">Treinos cadastrados ({rows.length})</h2>
        <p className="text-sm text-g4-muted">
          Todos os treinos enviados hoje, por aluno. Clique num treino pra editar/reenviar, ou use &quot;Usar
          para outro aluno&quot; pra reaproveitar a mesma prescrição com outra pessoa.
        </p>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-g4-muted">
          Nenhum treino prescrito ainda — use a aba &quot;Criar / Prescrever treino&quot;.
        </p>
      )}

      {/* Celular: cards empilhados — mesma razão do RosterTab (tabela larga
          esconderia colunas sem indicação de rolagem). */}
      <div className="flex flex-col gap-4 sm:hidden">
        {rows.map(({ student, workout }) => (
          <Card key={student.id} className="p-4">
            <button
              type="button"
              onClick={() => onOpenInPrescribe(student.id)}
              className="w-full text-left focus-ring"
            >
              <div className="flex items-center gap-4">
                <Avatar name={student.name} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-g4-ink">{student.name}</p>
                  <p className="text-xs text-g4-muted">{workout.title}</p>
                </div>
                <StatusDot status={workout.status} showLabel={false} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <p className="text-g4-muted">
                  Modalidade <span className="text-g4-ink">{workout.discipline}</span>
                </p>
                <p className="text-g4-muted">
                  Data <span className="text-g4-ink">{workout.scheduledDateLabel}</span>
                </p>
              </div>
              <div className="mt-3">
                <Badge tone={hasVideo(workout) ? "lime" : "neutral"}>
                  {hasVideo(workout) ? "Com vídeo" : "Sem vídeo"}
                </Badge>
              </div>
            </button>
            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-g4-border pt-3">
              <button type="button" onClick={() => onUseAsTemplate(workout)} className={actionLinkClass}>
                Usar para outro aluno
              </button>
              <button type="button" onClick={() => onViewAnalysis(student.id)} className={actionLinkClass}>
                Ver análise
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop/tablet: tabela completa, cabe sem rolagem. */}
      {rows.length > 0 && (
        <Card className="hidden overflow-hidden p-0 sm:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-g4-surface-alt text-g4-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Aluno</th>
                <th className="px-5 py-3 font-medium">Treino</th>
                <th className="px-5 py-3 font-medium">Modalidade</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Vídeo</th>
                <th className="px-5 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-g4-border">
              {rows.map(({ student, workout }) => (
                <tr key={student.id} className="hover:bg-g4-surface-alt">
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => onOpenInPrescribe(student.id)}
                      className="flex items-center gap-4 text-left focus-ring"
                    >
                      <Avatar name={student.name} className="h-9 w-9" />
                      <p className="font-medium text-g4-ink">{student.name}</p>
                    </button>
                  </td>
                  <td className="px-5 py-3 text-g4-muted">{workout.title}</td>
                  <td className="px-5 py-3 text-g4-muted">{workout.discipline}</td>
                  <td className="px-5 py-3 text-g4-muted">{workout.scheduledDateLabel}</td>
                  <td className="px-5 py-3">
                    <StatusDot status={workout.status} />
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={hasVideo(workout) ? "lime" : "neutral"}>
                      {hasVideo(workout) ? "Com vídeo" : "Sem vídeo"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={() => onUseAsTemplate(workout)} className={actionLinkClass}>
                        Usar p/ outro aluno
                      </button>
                      <button type="button" onClick={() => onViewAnalysis(student.id)} className={actionLinkClass}>
                        Ver análise
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
