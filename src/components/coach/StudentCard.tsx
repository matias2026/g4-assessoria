"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import type { MockStudent } from "@/lib/mock-data";

interface StudentCardProps {
  student: MockStudent;
}

// Cartão de aluno para telas estreitas — a tabela larga (6 colunas) fica
// ilegível/sem indicação de rolagem no celular, escondendo justamente o
// status do Strava e a seta de navegação. O cartão inteiro é a área de
// toque, sem depender de rolar para o lado para descobrir a interação.
export function StudentCard({ student }: StudentCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/cockpit/treinos/${student.id}`)}
      className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 active:bg-g4-surface-alt"
    >
      <div className="min-w-0">
        <p className="font-medium text-g4-ink">{student.name}</p>
        <p className="text-xs text-g4-muted">{student.discipline}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StatusDot status={student.todayStatus} />
          <Badge tone={student.stravaSynced ? "lime" : "neutral"}>
            {student.stravaSynced ? "Strava sincronizado" : "Strava não conectado"}
          </Badge>
        </div>
        {student.lastActivity && (
          <p className="mt-1 text-xs text-g4-muted">
            {student.lastActivity.name} · {student.lastActivity.distanceKm} km
          </p>
        )}
      </div>
      <span aria-hidden className="shrink-0 text-lg text-g4-muted">
        ›
      </span>
    </div>
  );
}
