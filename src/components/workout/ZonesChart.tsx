import { Card, CardTitle } from "@/components/ui/Card";

export interface ZoneDatum {
  zone: string;
  label: string;
  plannedMinutes: number;
  completedMinutes: number;
}

interface ZonesChartProps {
  title: string;
  data: ZoneDatum[];
}

/**
 * Tempo em zona, planejado vs. concluído — mesma métrica em dois momentos,
 * por isso 1 matiz (verde G4) em 2 tons: `lime-dim` (planejado) e
 * `lime-deep` (concluído). Par validado com scripts/validate_palette.js da
 * skill de dataviz (CVD/normal-vision OK; contraste baixo do tom claro é
 * compensado com rótulo direto no fim de cada barra).
 */
export function ZonesChart({ title, data }: ZonesChartProps) {
  const maxMinutes = Math.max(1, ...data.flatMap((d) => [d.plannedMinutes, d.completedMinutes]));

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-4 text-xs text-g4-muted">
          <span className="inline-flex items-center gap-4">
            <span className="h-2 w-2 rounded-full bg-lime-dim" aria-hidden />
            Planejado
          </span>
          <span className="inline-flex items-center gap-4">
            <span className="h-2 w-2 rounded-full bg-lime-deep" aria-hidden />
            Concluído
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {data.map((zone) => (
          <div key={zone.zone} className="flex items-center gap-4">
            <div className="w-24 shrink-0">
              <p className="text-sm font-medium text-g4-ink">{zone.zone}</p>
              <p className="text-xs text-g4-muted">{zone.label}</p>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-4.5">
              <div className="flex items-center gap-4">
                <div className="h-3.5 flex-1 rounded-sm bg-g4-surface-alt">
                  <div
                    className="h-3.5 rounded-r-[4px] bg-lime-dim"
                    style={{ width: `${(zone.plannedMinutes / maxMinutes) * 100}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-xs tabular-nums text-g4-muted">
                  {zone.plannedMinutes}min
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-3.5 flex-1 rounded-sm bg-g4-surface-alt">
                  <div
                    className="h-3.5 rounded-r-[4px] bg-lime-deep"
                    style={{ width: `${(zone.completedMinutes / maxMinutes) * 100}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-xs tabular-nums text-g4-ink">
                  {zone.completedMinutes}min
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
