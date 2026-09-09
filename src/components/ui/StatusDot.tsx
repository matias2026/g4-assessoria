import { cn } from "@/lib/utils";
import type { WorkoutStatus } from "@/lib/supabase/types";

const statusConfig: Record<WorkoutStatus, { label: string; dot: string; text: string }> = {
  done: { label: "Concluído", dot: "bg-status-done-dot", text: "text-status-done" },
  pending: { label: "Pendente", dot: "bg-status-pending-dot", text: "text-status-pending" },
  missed: { label: "Perdido", dot: "bg-status-missed-dot", text: "text-status-missed" },
};

interface StatusDotProps {
  status: WorkoutStatus;
  showLabel?: boolean;
  className?: string;
}

// Semáforo de cumprimento de treino usado na Home do atleta e no Cockpit do treinador.
export function StatusDot({ status, showLabel = true, className }: StatusDotProps) {
  const config = statusConfig[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("h-2.5 w-2.5 rounded-full", config.dot)} aria-hidden />
      {showLabel && <span className={cn("text-xs font-medium", config.text)}>{config.label}</span>}
    </span>
  );
}
