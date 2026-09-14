"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import Script from "next/script";
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

type LoginRole = "athlete" | "coach";

// Botão de olho da senha, mesma cor no tema escuro desta tela — a versão
// padrão do componente assume fundo claro (ver PasswordInput.tsx).
const PASSWORD_TOGGLE_CLASSES =
  "text-gray-500 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/50 rounded-lg";

const FIELD_CLASSES =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition-colors focus:border-lime-400/70 focus:bg-white/[0.07]";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [role, setRole] = useState<LoginRole>("athlete");

  return (
    <div className="mt-6">
      {SITE_KEY && <Script src="https://www.google.com/recaptcha/api.js" strategy="afterInteractive" />}

      <p className="text-center text-sm text-gray-400">Acesso restrito a treinador e aluno cadastrado.</p>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setRole("athlete")}
          className={cn(
            "rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60",
            role === "athlete" ? "bg-lime-400 text-[#0f1115] shadow-sm" : "text-gray-400 hover:text-gray-200"
          )}
        >
          Sou aluno
        </button>
        <button
          type="button"
          onClick={() => setRole("coach")}
          className={cn(
            "rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60",
            role === "coach" ? "bg-lime-400 text-[#0f1115] shadow-sm" : "text-gray-400 hover:text-gray-200"
          )}
        >
          Sou treinador
        </button>
      </div>

      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="expected_role" value={role} />

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-gray-300">E-mail</span>
          <input type="email" name="email" required autoComplete="email" className={FIELD_CLASSES} />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-gray-300">Senha</span>
          <PasswordInput
            name="password"
            required
            autoComplete="current-password"
            className={FIELD_CLASSES}
            toggleClassName={PASSWORD_TOGGLE_CLASSES}
          />
        </label>

        {SITE_KEY && <div className="g-recaptcha" data-sitekey={SITE_KEY} data-theme="dark" />}

        {state.error && <p className="text-sm text-red-400">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 w-full rounded-xl bg-lime-400 px-4 py-3 text-sm font-semibold text-[#0f1115] transition-colors hover:bg-lime-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161b22] disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? "Entrando..." : role === "athlete" ? "Entrar como aluno" : "Entrar como treinador"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs leading-relaxed text-gray-500">
        Ainda não tem conta?{" "}
        <Link href="/solicitar-acesso" className="font-medium text-lime-400 underline underline-offset-2 hover:text-lime-300">
          Criar conta
        </Link>
        . O treinador revisa antes de liberar o login.
      </p>
    </div>
  );
}
