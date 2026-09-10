"use client";

import { useState } from "react";
import { useActionState } from "react";
import Script from "next/script";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { submitAccessRequest, type RequestAccessState } from "./actions";

const initialState: RequestAccessState = { error: null, success: false };

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

type RequestRole = "athlete" | "coach";

export function RequestAccessForm() {
  const [state, formAction, pending] = useActionState(submitAccessRequest, initialState);
  const [role, setRole] = useState<RequestRole>("athlete");

  if (state.success) {
    return (
      <Card className="w-full max-w-sm p-6 text-center">
        <h1 className="text-lg font-bold text-g4-ink">Pedido enviado!</h1>
        <p className="mt-2 text-sm text-g4-muted">
          O treinador vai revisar seu pedido e te avisar por fora (WhatsApp/e-mail) quando sua conta estiver pronta.
        </p>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm p-6">
      {SITE_KEY && <Script src="https://www.google.com/recaptcha/api.js" strategy="afterInteractive" />}

      <h1 className="text-lg font-bold text-g4-ink">Pedir acesso</h1>
      <p className="mt-1 text-sm text-g4-muted">
        Preencha seus dados — o treinador revisa e libera seu login.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-g4-surface-alt p-1">
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
        <input type="hidden" name="role_requested" value={role} />

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-g4-ink">Nome completo</span>
          <input
            name="full_name"
            required
            className="rounded-xl border border-g4-border bg-white px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-g4-ink">E-mail</span>
          <input
            type="email"
            name="email"
            required
            className="rounded-xl border border-g4-border bg-white px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-g4-ink">WhatsApp (opcional)</span>
          <input
            name="phone"
            className="rounded-xl border border-g4-border bg-white px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-g4-ink">Mensagem (opcional)</span>
          <textarea
            name="message"
            rows={3}
            className="rounded-xl border border-g4-border bg-white px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        {SITE_KEY && <div className="g-recaptcha" data-sitekey={SITE_KEY} />}

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <Button type="submit" variant="primary" className="mt-1 w-full" disabled={pending}>
          {pending ? "Enviando..." : "Enviar pedido"}
        </Button>
      </form>
    </Card>
  );
}
