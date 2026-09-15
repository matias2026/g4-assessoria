"use client";

import { useState } from "react";
import { useActionState } from "react";
import Script from "next/script";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { DISCIPLINES } from "@/lib/student-profile-form";
import { calculateAge, estimateMaxHeartRate } from "@/lib/workout-metrics";
import { submitAccessRequest, type RequestAccessState } from "./actions";

const initialState: RequestAccessState = { error: null, success: false };

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

type RequestRole = "athlete" | "coach";

type Experience = "iniciante" | "experiente";
const EXPERIENCE_OPTIONS: { value: Experience; label: string }[] = [
  { value: "iniciante", label: "Sou novato(a)" },
  { value: "experiente", label: "Já tenho experiência" },
];

// PAR-Q (Physical Activity Readiness Questionnaire) — questionário
// padrão de triagem pré-atividade física, desenvolvido pela CSEP
// (Canadian Society for Exercise Physiology) e adotado no Brasil como
// referência por academias/personal trainers (citado na Lei 15.681/13
// do Ceará sobre avaliação física em academias). São 7 perguntas
// objetivas de sim/não — "sim" em qualquer uma indica que a pessoa deve
// conversar com um médico antes de aumentar o nível de atividade física.
const PARQ_QUESTIONS = [
  {
    id: "heart",
    text: "Algum médico já disse que você tem um problema de coração e recomendou atividade física só com acompanhamento médico?",
  },
  {
    id: "chest_pain_activity",
    text: "Você sente dor no peito quando pratica atividade física?",
  },
  {
    id: "chest_pain_rest",
    text: "No último mês, sentiu dor no peito mesmo sem estar se exercitando?",
  },
  {
    id: "balance",
    text: "Você perde o equilíbrio por tontura ou já perdeu a consciência?",
  },
  {
    id: "bone_joint",
    text: "Tem algum problema ósseo ou articular que pode piorar com o exercício (ex.: joelho, coluna, ombro)?",
  },
  {
    id: "bp_medication",
    text: "Toma remédio controlado para pressão arterial ou para o coração?",
  },
  {
    id: "other",
    text: "Sabe de algum outro motivo pelo qual não deveria fazer atividade física sem acompanhamento?",
  },
] as const;

export function RequestAccessForm() {
  const [state, formAction, pending] = useActionState(submitAccessRequest, initialState);
  const [role, setRole] = useState<RequestRole>("athlete");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const [birthDate, setBirthDate] = useState("");
  const [modalidade, setModalidade] = useState(DISCIPLINES[0]);
  const [experience, setExperience] = useState<Experience>("iniciante");
  const [parqAnswers, setParqAnswers] = useState<Record<string, boolean>>({});
  const [boneJointLocation, setBoneJointLocation] = useState("");

  const estimatedHrMax =
    birthDate && !Number.isNaN(Date.parse(birthDate)) ? estimateMaxHeartRate(calculateAge(birthDate)) : null;
  const anyParqYes = Object.values(parqAnswers).some(Boolean);
  const medicalNotes = PARQ_QUESTIONS.filter((q) => parqAnswers[q.id])
    .map((q) => (q.id === "bone_joint" && boneJointLocation.trim() ? `${q.text} (${boneJointLocation.trim()})` : q.text))
    .join("; ");

  if (state.success) {
    return (
      <Card className="w-full max-w-sm p-6 text-center">
        <h1 className="text-lg font-bold text-g4-ink">Pedido enviado!</h1>
        <p className="mt-2 text-sm text-g4-muted">
          O treinador vai revisar seu pedido e te avisar por fora (WhatsApp/e-mail) quando sua conta estiver pronta.
          Guarde a senha que você definiu — vai usar ela pra entrar.
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

      <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-g4-surface-alt p-1">
        <button
          type="button"
          onClick={() => setRole("athlete")}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-ring",
            role === "athlete" ? "bg-lime text-ink-on-lime" : "text-g4-muted hover:text-g4-ink"
          )}
        >
          Sou aluno
        </button>
        <button
          type="button"
          onClick={() => setRole("coach")}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-ring",
            role === "coach" ? "bg-lime text-ink-on-lime" : "text-g4-muted hover:text-g4-ink"
          )}
        >
          Sou treinador
        </button>
      </div>

      <form
        action={formAction}
        onSubmit={(e) => {
          if (passwordMismatch) e.preventDefault();
        }}
        className="mt-4 flex flex-col gap-4"
      >
        <input type="hidden" name="role_requested" value={role} />

        <label className="flex flex-col gap-4 text-sm">
          <span className="font-medium text-g4-ink">Nome completo</span>
          <input
            name="full_name"
            required
            className="rounded-xl border border-g4-border bg-g4-surface px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        <label className="flex flex-col gap-4 text-sm">
          <span className="font-medium text-g4-ink">E-mail</span>
          <input
            type="email"
            name="email"
            required
            className="rounded-xl border border-g4-border bg-g4-surface px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        <label className="flex flex-col gap-4 text-sm">
          <span className="font-medium text-g4-ink">Senha</span>
          <PasswordInput
            name="password"
            required
            minLength={8}
            placeholder="mín. 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-g4-border bg-g4-surface px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        <label className="flex flex-col gap-4 text-sm">
          <span className="font-medium text-g4-ink">Confirmar senha</span>
          <PasswordInput
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-g4-border bg-g4-surface px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
          {passwordMismatch && <span className="text-xs text-status-missed">As senhas não coincidem.</span>}
        </label>

        <label className="flex flex-col gap-4 text-sm">
          <span className="font-medium text-g4-ink">WhatsApp (opcional)</span>
          <input
            name="phone"
            className="rounded-xl border border-g4-border bg-g4-surface px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        {role === "athlete" && (
          <>
            <div className="flex flex-col gap-4 text-sm">
              <span className="font-medium text-g4-ink">Modalidade</span>
              <input type="hidden" name="modalidade" value={modalidade} />
              <div className="grid grid-cols-3 gap-4 rounded-xl bg-g4-surface-alt p-1">
                {DISCIPLINES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setModalidade(d)}
                    className={cn(
                      "rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-ring",
                      modalidade === d ? "bg-lime text-ink-on-lime" : "text-g4-muted hover:text-g4-ink"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 text-sm">
              <span className="font-medium text-g4-ink">Experiência com treino</span>
              <input type="hidden" name="training_experience" value={experience} />
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-g4-surface-alt p-1">
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExperience(opt.value)}
                    className={cn(
                      "rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-ring",
                      experience === opt.value ? "bg-lime text-ink-on-lime" : "text-g4-muted hover:text-g4-ink"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {experience === "iniciante" && (
                <span className="text-xs text-g4-muted">
                  Sem treino registrado ainda — a FC máxima abaixo é só uma estimativa pela idade, até você ter um
                  valor medido de verdade.
                </span>
              )}
            </div>

            <label className="flex flex-col gap-4 text-sm">
              <span className="font-medium text-g4-ink">Data de nascimento</span>
              <input
                type="date"
                name="birth_date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="rounded-xl border border-g4-border bg-g4-surface px-3 py-2.5 text-sm text-g4-ink focus-ring"
              />
              {estimatedHrMax && (
                <span className="text-xs text-g4-muted">
                  FC máxima estimada: <span className="font-medium text-g4-ink">{estimatedHrMax} bpm</span> (o
                  treinador pode ajustar depois com um valor medido)
                </span>
              )}
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-4 text-sm">
                <span className="font-medium text-g4-ink">Peso (kg)</span>
                <input
                  type="number"
                  name="weight_kg"
                  min={0}
                  step={0.1}
                  className="rounded-xl border border-g4-border bg-g4-surface px-3 py-2.5 text-sm text-g4-ink focus-ring"
                />
              </label>
              <label className="flex flex-col gap-4 text-sm">
                <span className="font-medium text-g4-ink">Altura (cm)</span>
                <input
                  type="number"
                  name="height_cm"
                  min={0}
                  className="rounded-xl border border-g4-border bg-g4-surface px-3 py-2.5 text-sm text-g4-ink focus-ring"
                />
              </label>
            </div>

            <div className="flex flex-col gap-4 text-sm">
              <span className="font-medium text-g4-ink">Anamnese (PAR-Q) — marque o que for &ldquo;sim&rdquo;</span>
              <input type="hidden" name="medical_notes" value={medicalNotes} />
              <div className="flex flex-col divide-y divide-g4-border rounded-xl border border-g4-border bg-g4-surface">
                {PARQ_QUESTIONS.map((q) => (
                  <div key={q.id} className="p-3">
                    <label className="flex items-start gap-4 text-sm text-g4-ink">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={!!parqAnswers[q.id]}
                        onChange={() => setParqAnswers((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                      />
                      {q.text}
                    </label>
                    {q.id === "bone_joint" && parqAnswers[q.id] && (
                      <input
                        value={boneJointLocation}
                        onChange={(e) => setBoneJointLocation(e.target.value)}
                        placeholder="Onde? Ex.: joelho direito"
                        className="mt-2 ml-8 w-[calc(100%-2rem)] rounded-xl border border-g4-border bg-g4-surface px-3 py-2 text-sm text-g4-ink focus-ring"
                      />
                    )}
                  </div>
                ))}
              </div>
              {anyParqYes && (
                <p className="text-xs text-g4-muted">
                  Marcar &ldquo;sim&rdquo; em qualquer pergunta não te impede de criar a conta — é só uma indicação
                  pro treinador conversar com você antes de aumentar a intensidade dos treinos.
                </p>
              )}
            </div>
          </>
        )}

        <label className="flex flex-col gap-4 text-sm">
          <span className="font-medium text-g4-ink">Mensagem (opcional)</span>
          <textarea
            name="message"
            rows={3}
            className="rounded-xl border border-g4-border bg-g4-surface px-3 py-2.5 text-sm text-g4-ink focus-ring"
          />
        </label>

        {SITE_KEY && <div className="g-recaptcha" data-sitekey={SITE_KEY} />}

        {state.error && <p className="text-sm text-status-missed">{state.error}</p>}

        <Button type="submit" variant="primary" className="mt-1 w-full" disabled={pending || passwordMismatch}>
          {pending ? "Enviando..." : "Enviar pedido"}
        </Button>
      </form>
    </Card>
  );
}
