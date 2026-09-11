import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import { CockpitStats } from "@/components/coach/CockpitStats";
import type { MockStudent } from "@/lib/mock-data";
import type { WorkoutStatus } from "@/lib/supabase/types";

interface TodayOverviewTabProps {
  students: MockStudent[];
}

const accentBorder: Record<WorkoutStatus, string> = {
  done: "border-l-status-done-dot",
  pending: "border-l-status-pending-dot",
  missed: "border-l-status-missed-dot",
};

/**
 * Aba "Acompanhamento do dia": leitura rápida de quem já treinou, quem está
 * pendente e quem sincronizou o Strava — sem os campos de edição das outras
 * abas.
 */
export function TodayOverviewTab({ students }: TodayOverviewTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <CockpitStats students={students} />

      <div className="flex flex-col gap-4">
        {students.map((student) => (
          <div
            key={student.id}
            className={`flex items-center gap-4 rounded-2xl border border-g4-border border-l-4 bg-g4-surface p-3.5 shadow-sm ${accentBorder[student.todayStatus]}`}
          >
            <Avatar name={student.name} className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-g4-ink">{student.name}</p>
              <p className="text-xs text-g4-muted">{student.discipline}</p>
            </div>
            <StatusDot status={student.todayStatus} />
            <Badge tone={student.stravaSynced ? "lime" : "neutral"}>
              {student.stravaSynced ? "Strava OK" : "Sem Strava"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
