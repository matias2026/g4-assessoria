import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import { DEMO_WORKOUT_ID, type MockStudent } from "@/lib/mock-data";

interface StudentsTableProps {
  students: MockStudent[];
}

export function StudentsTable({ students }: StudentsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-g4-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-g4-surface-alt text-g4-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Atleta</th>
            <th className="px-4 py-3 font-medium">Modalidade</th>
            <th className="px-4 py-3 font-medium">Semana</th>
            <th className="px-4 py-3 font-medium">Última atividade (Strava)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-g4-border bg-g4-surface">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-g4-surface-alt/60">
              <td className="px-4 py-3 font-medium text-g4-ink">
                {/* TODO: apontar para o treino do dia real do aluno, não o id de demonstração. */}
                <Link href={`/cockpit/treinos/${DEMO_WORKOUT_ID}`} className="hover:text-lime-deep">
                  {student.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-g4-muted">{student.discipline}</td>
              <td className="px-4 py-3">
                <StatusDot status={student.weeklyStatus} />
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
