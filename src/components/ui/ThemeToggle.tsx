"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "g4-theme";
// Não existe evento nativo pra "atributo da <html> mudou" — dispara isso
// manualmente depois de escrever o atributo, pra useSyncExternalStore
// saber que precisa reler o snapshot (e re-renderizar todo ThemeToggle
// montado, se um dia houver mais de um na tela ao mesmo tempo).
const THEME_CHANGE_EVENT = "g4-theme-change";

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

// O servidor não sabe a preferência salva (localStorage não existe lá) —
// sempre "light" aqui pra bater com a primeira pintura; useSyncExternalStore
// relê o snapshot de verdade assim que hidrata, sem precisar de um efeito
// manual (o script anti-flash em layout.tsx já corrigiu a tela antes disso).
function getServerSnapshot(): Theme {
  return "light";
}

function subscribe(callback: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, callback);
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Alterna entre tema claro e escuro pro app inteiro (Cockpit + área do
 * aluno + admin) — a tela de login fica sempre escura por escolha de
 * design, então não tem esse botão (ver src/app/login/page.tsx). A escolha
 * fica salva em localStorage e vale pra próxima vez que abrir; um script
 * inline em layout.tsx já aplica o tema salvo antes da primeira pintura,
 * pra não piscar claro-depois-escuro no carregamento.
 *
 * Lê o estado de `document.documentElement` via useSyncExternalStore em vez
 * de guardar num useState próprio — o atributo data-theme é a fonte de
 * verdade (já setada pelo script anti-flash antes do React montar), então
 * isso evita duplicar esse estado e precisar sincronizar os dois.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      className="shrink-0 rounded-lg p-2 text-g4-ink hover:bg-g4-surface-alt focus-ring"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
