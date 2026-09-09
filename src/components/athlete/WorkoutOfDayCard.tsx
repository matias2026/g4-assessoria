import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import type { MockWorkoutOfDay } from "@/lib/mock-data";

export function WorkoutOfDayCard({ workout }: { workout: MockWorkoutOfDay }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Treino de hoje</CardTitle>
        <Badge tone="lime">{workout.discipline}</Badge>
      </div>

      <h2 className="mt-2 text-xl font-semibold text-white">{workout.title}</h2>
      <p className="mt-1 text-sm text-g4-muted">{workout.description}</p>

      <div className="mt-4 flex items-center justify-between">
        <StatusDot status={workout.status} />
        <Button variant="primary" className="px-5">
          Marcar como concluído
        </Button>
      </div>
    </Card>
  );
}
