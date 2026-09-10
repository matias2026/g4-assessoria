"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <Card className="w-full max-w-sm p-6">
      <h1 className="text-lg font-bold text-g4-ink">Entrar</h1>
      <p className="mt-1 text-sm text-g4-muted">Acesso restrito a treinador e aluno cadastrado.</p>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-g4-ink">E-mail</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-xl border border-g4-border bg-white px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
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
          {pending ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </Card>
  );
}
