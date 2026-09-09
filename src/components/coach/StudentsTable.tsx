import { StudentCard } from "@/components/coach/StudentCard";
import type { MockStudent } from "@/lib/mock-data";

interface StudentsTableProps {
  students: MockStudent[];
}

// Grid de cards — mesmo layout no celular e no desktop (1/2/3 colunas), sem
// o formato de tabela: mantém todas as informações visíveis de uma vez, sem
// rolagem lateral escondendo colunas nem depender de hover para navegar.
export function StudentsTable({ students }: StudentsTableProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {students.map((student) => (
        <StudentCard key={student.id} student={student} />
      ))}
    </div>
  );
}
