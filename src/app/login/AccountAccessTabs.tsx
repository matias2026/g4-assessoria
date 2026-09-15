"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RequestAccessForm } from "@/app/solicitar-acesso/RequestAccessForm";
import { LoginForm } from "./LoginForm";

type Tab = "login" | "signup";

/**
 * Tela principal (login): alterna entre "Entrar" e "Criar conta" sem sair
 * da página — antes "criar conta" só existia direto no /admin (o
 * treinador criava a conta por fora) ou como link separado pra
 * /solicitar-acesso; agora é uma aba aqui mesmo, reaproveitando o
 * RequestAccessForm (pedido revisado pelo treinador, senha definida pela
 * própria pessoa).
 */
export function AccountAccessTabs({ next }: { next: string }) {
  const [tab, setTab] = useState<Tab>("login");

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setTab("login")}
          className={cn(
            "rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60",
            tab === "login" ? "bg-lime-400 text-[#0f1115] shadow-sm" : "text-gray-400 hover:text-gray-200"
          )}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setTab("signup")}
          className={cn(
            "rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60",
            tab === "signup" ? "bg-lime-400 text-[#0f1115] shadow-sm" : "text-gray-400 hover:text-gray-200"
          )}
        >
          Criar conta
        </button>
      </div>

      <div className="mt-5">{tab === "login" ? <LoginForm next={next} /> : <RequestAccessForm embedded />}</div>
    </div>
  );
}
