"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface StudentRowProps {
  href: string;
  children: ReactNode;
}

// Linha inteira clicável (não só o nome) — em touch não existe hover para
// sinalizar que o texto é um link, então a linha toda precisa responder ao
// toque para a navegação ser descoberta.
export function StudentRow({ href, children }: StudentRowProps) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(href)}
      className="cursor-pointer hover:bg-g4-surface-alt/60 active:bg-g4-surface-alt"
    >
      {children}
    </tr>
  );
}
