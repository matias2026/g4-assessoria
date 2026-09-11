"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { createAccount, type CreateAccountState } from "./actions";

const initialState: CreateAccountState = { error: null, success: null };

export function CreateAccountForm() {
  const [state, formAction, pending] = useActionState(createAccount, initialState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-4 text-sm">
          <span className="font-medium text-g4-ink">Nome completo</span>
          <input
            name="full_name"
            required
            className="rounded-xl border border-g4-border bg-white px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        <label className="flex flex-col gap-4 text-sm">
          <span className="font-medium text-g4-ink">Papel</span>
          <select
            name="role"
            required
            defaultValue="athlete"
            className="rounded-xl border border-g4-border bg-white px-3 py-2.5 text-sm text-g4-ink focus-ring"
          >
            <option value="athlete">Aluno</option>
            <option value="coach">Treinador</option>
            <option value="admin">Administrador</option>
          </select>
        </label>

        <label className="flex flex-col gap-4 text-sm">
          <span className="font-medium text-g4-ink">E-mail</span>
          <input
            type="email"
            name="email"
            required
            className="rounded-xl border border-g4-border bg-white px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        <label className="flex flex-col gap-4 text-sm">
          <span className="font-medium text-g4-ink">Senha provisória</span>
          <input
            type="text"
            name="password"
            required
            minLength={8}
            placeholder="mín. 8 caracteres"
            className="rounded-xl border border-g4-border bg-white px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-lime-deep">{state.success}</p>}

      <Button type="submit" variant="primary" className="self-start px-5" disabled={pending}>
        {pending ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  );
}
