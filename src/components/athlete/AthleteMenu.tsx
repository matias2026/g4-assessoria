"use client";

import { useState } from "react";
import Link from "next/link";
import { signOutAction } from "@/lib/supabase/auth-actions";

interface AthleteMenuProps {
  talkToCoachLink: string;
}

const MENU_LINKS = [
  { href: "/dashboard", label: "Treinos" },
  { href: "/dashboard/ficha", label: "Minha ficha" },
  { href: "/dashboard/senha", label: "Alterar senha" },
  { href: "/dashboard/relatorio#meu-relatorio", label: "Relatório" },
  { href: "/dashboard/relatorio#relatorio-treinador", label: "Relatório do treinador" },
];

/**
 * Menu hambúrguer do aluno: reúne toda a navegação de "Meu perfil" (treinos,
 * ficha, senha, relatórios) mais falar com o treinador e sair, num só lugar
 * — cabe em qualquer largura de tela sem disputar espaço com o cabeçalho.
 */
export function AthleteMenu({ talkToCoachLink }: AthleteMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Abrir menu"
        aria-expanded={open}
        className="rounded-lg p-2 text-g4-ink hover:bg-g4-surface-alt focus-ring"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <>
          {/* Camada invisível pra fechar ao clicar fora, sem precisar de listener global. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-g4-border bg-white shadow-lg">
            <nav className="flex flex-col py-1.5">
              {MENU_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-g4-ink hover:bg-g4-surface-alt"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href={talkToCoachLink}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-g4-ink hover:bg-g4-surface-alt"
              >
                💬 Falar com treinador
              </a>
            </nav>
            <div className="border-t border-g4-border">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-g4-ink hover:bg-g4-surface-alt"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
