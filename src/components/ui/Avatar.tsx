import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Avatar com as iniciais do nome, acento verde G4 — usado no lugar de foto
// (não temos upload de imagem) para dar identidade visual a cada aluno no
// cockpit, em vez de uma linha de texto genérica.
export function Avatar({ name, className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-lime/15 text-sm font-bold text-lime-deep",
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
