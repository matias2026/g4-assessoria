import Link from "next/link";
import { PREVIEW_DISCIPLINES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface AdminPreviewSwitcherProps {
  basePath: string;
  activeDiscipline: string;
}

/**
 * Seletor de modalidade pra prévia do admin (sem ficha própria em
 * `alunos`) — mesmo bloco reaproveitado no treino do dia e nas telas de
 * "Meu perfil", só troca o `basePath` pra onde cada link deve apontar.
 */
export function AdminPreviewSwitcher({ basePath, activeDiscipline }: AdminPreviewSwitcherProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-medium text-g4-muted">Prévia da área do atleta (admin)</p>
      <nav className="flex gap-4 rounded-2xl border border-g4-border bg-g4-surface p-1.5">
        {PREVIEW_DISCIPLINES.map((discipline) => (
          <Link
            key={discipline}
            href={`${basePath}?preview=${discipline}`}
            className={cn(
              "flex-1 rounded-xl px-4 py-2 text-center text-sm font-semibold transition-colors focus-ring",
              activeDiscipline === discipline
                ? "bg-lime text-g4-ink"
                : "text-g4-muted hover:bg-g4-surface-alt hover:text-g4-ink"
            )}
          >
            {discipline}
          </Link>
        ))}
      </nav>
    </div>
  );
}
