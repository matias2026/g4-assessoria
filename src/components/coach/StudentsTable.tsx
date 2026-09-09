import { Badge } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import { StudentCard } from "@/components/coach/StudentCard";
import { StudentRow } from "@/components/coach/StudentRow";
import type { MockStudent } from "@/lib/mock-data";

interface StudentsTableProps {
  students: MockStudent[];
}

export function StudentsTable({ students }: StudentsTableProps) {
  return (
    <>
      {/* Celular: cards empilhados, sem rolagem lateral escondendo colunas. */}
      <div className="divide-y divide-g4-border rounded-2xl border border-g4-border bg-g4-surface sm:hidden">
        {students.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden overflow-hidden rounded-2xl border border-g4-border sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-g4-surface-alt text-g4-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Atleta</th>
              <th className="px-4 py-3 font-medium">Modalidade</th>
              <th className="px-4 py-3 font-medium">Treino de hoje</th>
              <th className="px-4 py-3 font-medium">Strava</th>
              <th className="px-4 py-3 font-medium">Última atividade</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-g4-border bg-g4-surface">
            {students.map((student) => (
              <StudentRow key={student.id} href={`/cockpit/treinos/${student.id}`}>
                <td className="px-4 py-3 font-medium text-g4-ink">{student.name}</td>
                <td className="px-4 py-3 text-g4-muted">{student.discipline}</td>
                <td className="px-4 py-3">
                  <StatusDot status={student.todayStatus} />
                </td>
                <td className="px-4 py-3">
                  <Badge tone={student.stravaSynced ? "lime" : "neutral"}>
                    {student.stravaSynced ? "Sincronizado" : "Não conectado"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {student.lastActivity ? (
                    <span className="text-g4-muted">
                      {student.lastActivity.name} · {student.lastActivity.distanceKm} km ·{" "}
                      {student.lastActivity.date}
                    </span>
                  ) : (
                    <Badge tone="neutral">Sem dados</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-g4-muted">
                  <span aria-hidden>›</span>
                  <span className="sr-only">Ver e editar prescrição</span>
                </td>
              </StudentRow>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
