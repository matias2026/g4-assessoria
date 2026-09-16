"use client";

import { useActionState } from "react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useRecaptchaWidget } from "@/lib/useRecaptchaWidget";
import { createOrganization, type CreateOrganizationState } from "./actions";

const initialState: CreateOrganizationState = { error: null, success: false, orgSlug: null };

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

// Mesmas classes de campo/botão do LoginForm — tema escuro desta tela.
const FIELD_CLASSES =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition-colors focus:border-lime-400/70 focus:bg-white/[0.07]";
const PASSWORD_TOGGLE_CLASSES =
  "text-gray-500 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/50 rounded-lg";

export function CreateOrganizationForm() {
  const [state, formAction, pending] = useActionState(createOrganization, initialState);
  const recaptchaRef = useRecaptchaWidget(SITE_KEY, "dark");

  if (state.success) {
    const link = typeof window !== "undefined" ? `${window.location.origin}/login?org=${state.orgSlug}` : `/login?org=${state.orgSlug}`;
    return (
      <div className="mt-6 flex flex-col gap-4 text-center">
        <p className="text-sm text-gray-300">
          Assessoria criada! Você já pode entrar com o e-mail e a senha que cadastrou.
        </p>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-left">
          <p className="text-xs font-medium text-gray-400">Link de cadastro da sua assessoria</p>
          <p className="mt-1 break-all text-sm text-lime-300">{link}</p>
          <p className="mt-2 text-xs text-gray-500">
            Compartilhe esse link com seus alunos e treinadores — os pedidos de acesso enviados por ele caem
            direto na sua assessoria, não na de outra pessoa.
          </p>
        </div>
        <a
          href="/login"
          className="mt-1 w-full rounded-xl bg-lime-400 px-4 py-3 text-center text-sm font-semibold text-[#0f1115] transition-colors hover:bg-lime-300"
        >
          Ir para o login
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} autoComplete="off" className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-4 text-sm">
        <span className="font-medium text-gray-300">Nome da assessoria/academia</span>
        <input type="text" name="organization_name" required className={FIELD_CLASSES} placeholder="Ex.: Vida Ativa Assessoria" />
      </label>

      <label className="flex flex-col gap-4 text-sm">
        <span className="font-medium text-gray-300">Seu nome</span>
        <input type="text" name="full_name" required autoComplete="off" className={FIELD_CLASSES} />
      </label>

      <label className="flex flex-col gap-4 text-sm">
        <span className="font-medium text-gray-300">Seu e-mail</span>
        <input type="email" name="email" required autoComplete="off" className={FIELD_CLASSES} />
      </label>

      <label className="flex flex-col gap-4 text-sm">
        <span className="font-medium text-gray-300">Crie uma senha</span>
        <PasswordInput
          name="password"
          required
          autoComplete="off"
          minLength={8}
          className={FIELD_CLASSES}
          toggleClassName={PASSWORD_TOGGLE_CLASSES}
        />
      </label>

      {SITE_KEY && <div ref={recaptchaRef} />}

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full rounded-xl bg-lime-400 px-4 py-3 text-sm font-semibold text-[#0f1115] transition-colors hover:bg-lime-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161b22] disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? "Criando assessoria..." : "Criar assessoria"}
      </button>

      <p className="text-center text-xs text-gray-500">
        Você vira o administrador dela — cria treinadores e alunos direto pelo painel depois de entrar.
      </p>
    </form>
  );
}
