"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

type LoginRole = "athlete" | "coach";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [role, setRole] = useState<LoginRole>("athlete");

  return (
    <Card className="w-full max-w-sm p-6">
      <h1 className="text-lg font-bold text-g4-ink">Entrar</h1>
      <p className="mt-1 text-sm text-g4-muted">Acesso restrito a treinador e aluno cadastrado.</p>

      <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-g4-surface-alt p-1">
        <button
          type="button"
          onClick={() => setRole("athlete")}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-ring",
            role === "athlete" ? "bg-lime text-g4-ink" : "text-g4-muted hover:text-g4-ink"
          )}
        >
          Sou aluno
        </button>
        <button
          type="button"
          onClick={() => setRole("coach")}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-ring",
            role === "coach" ? "bg-lime text-g4-ink" : "text-g4-muted hover:text-g4-ink"
          )}
        >
          Sou treinador
        </button>
      </div>

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="expected_role" value={role} />

        <label className="flex flex-col gap-4 text-sm">
          <span className="font-medium text-g4-ink">E-mail</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-xl border border-g4-border bg-white px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        <label className="flex flex-col gap-4 text-sm">
          <span className="font-medium text-g4-ink">Senha</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded-xl border border-g4-border bg-white px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <Button type="submit" variant="primary" className="mt-1 w-full" disabled={pending}>
          {pending ? "Entrando..." : role === "athlete" ? "Entrar como aluno" : "Entrar como treinador"}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-g4-muted">
        Ainda não tem conta?{" "}
        <Link href="/solicitar-acesso" className="font-medium text-g4-ink underline">
          Peça acesso
        </Link>
      </p>
    </Card>
  );
}
