interface StepProgressProps {
  current: number;
  total: number;
  label: string;
}

/** Cabeçalho de assistente em passos: "Passo X de Y" + barra de progresso + título do passo. */
export function StepProgress({ current, total, label }: StepProgressProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-lime-deep">
        Passo {current} de {total}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-g4-surface-alt">
        <div
          className="h-full rounded-full bg-lime transition-all"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <h2 className="mt-3 text-lg font-bold text-g4-ink">{label}</h2>
    </div>
  );
}
