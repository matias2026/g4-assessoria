import { Card, CardTitle } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import type { WorkoutStatus } from "@/lib/supabase/types";

interface WeeklyHistoryProps {
  days: { day: string; status: WorkoutStatus }[];
}

export function WeeklyHistory({ days }: WeeklyHistoryProps) {
  const done = days.filter((d) => d.status === "done").length;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Semana</CardTitle>
        <span className="text-xs font-medium text-g4-muted">
          {done} de {days.length} dias concluídos
        </span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2">
        {days.map(({ day, status }) => (
          <div key={day} className="flex flex-col items-center gap-1.5">
            <span className="text-xs text-g4-muted">{day}</span>
            <StatusDot status={status} showLabel={false} />
          </div>
        ))}
      </div>
    </Card>
  );
}
