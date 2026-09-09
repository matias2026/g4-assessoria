import { Card, CardTitle } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import type { WorkoutStatus } from "@/lib/supabase/types";

interface WeeklyHistoryProps {
  days: { day: string; status: WorkoutStatus }[];
}

export function WeeklyHistory({ days }: WeeklyHistoryProps) {
  return (
    <Card>
      <CardTitle>Semana</CardTitle>
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
