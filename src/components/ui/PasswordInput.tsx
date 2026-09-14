"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  // Substitui as cores padrão (tema claro) do botão de olho — usado na tela
  // de login, que é tema escuro. Quando omitido, mantém o visual de sempre.
  toggleClassName?: string;
}

// Ícone de olho (mostrar/ocultar) sem depender de nenhuma lib de ícones —
// o projeto já usa emoji/SVG inline pontualmente em vez de puxar mais uma dependência.
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M3 3l18 18" strokeLinecap="round" />}
    </svg>
  );
}

// Campo de senha com botão de "ver senha" — usado em todo formulário que
// pede senha (login, pedir acesso, alterar senha, cadastro de aluno) pra
// dar pra conferir o que foi digitado antes de enviar.
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className, toggleClassName, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input ref={ref} type={visible ? "text" : "password"} className={cn("pr-11", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        className={cn(
          "absolute inset-y-0 right-0 flex w-11 items-center justify-center",
          toggleClassName ?? "text-g4-muted hover:text-g4-ink focus-ring"
        )}
      >
        <EyeIcon crossed={visible} />
      </button>
    </div>
  );
});
