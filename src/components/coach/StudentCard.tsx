"use client";

import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import type { MockStudent } from "@/lib/mock-data";
import type { WorkoutStatus } from "@/lib/supabase/types";

interface StudentCardProps {
  student: MockStudent;
}

// Borda de acento à esquerda por status — permite escanear o cockpit
// inteiro em segundos, sem precisar ler o texto de cada card.
const accentBorder: Record<WorkoutStatus, string> = {
  done: "border-l-status-done-dot",
  pending: "border-l-status-pending-dot",
  missed: "border-l-status-missed-dot",
};

// Card de aluno usado tanto no celular quanto no desktop (grid responsivo em
// StudentsTable) — o cartão inteiro é a área de toque, sem depender de hover
// ou de rolar uma tabela para o lado para descobrir a interação.
export function StudentCard({ student }: StudentCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/cockpit/treinos/${student.id}`)}
      className={`group flex cursor-pointer items-center gap-3 rounded-2xl border border-g4-border border-l-4 bg-g4-surface p-4 shadow-sm transition hover:shadow-md active:bg-g4-surface-alt ${accentBorder[student.todayStatus]}`}
    >
      <Avatar name={student.name} className="h-11 w-11 text-base" />

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-g4-ink">{student.name}</p>
        <p className="text-xs text-g4-muted">{student.discipline}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusDot status={student.todayStatus} />
          <Badge tone={student.stravaSynced ? "lime" : "neutral"}>
            {student.stravaSynced ? "Strava sincronizado" : "Strava não conectado"}
          </Badge>
        </div>
        {student.lastActivity && (
          <p className="mt-1.5 truncate text-xs text-g4-muted">
            {student.lastActivity.name} · {student.lastActivity.distanceKm} km ·{" "}
            {student.lastActivity.date}
          </p>
        )}
      </div>

      <span
        aria-hidden
        className="shrink-0 text-xl text-g4-muted transition group-hover:text-lime-deep"
      >
        ›
      </span>
    </div>
  );
}
