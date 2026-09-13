"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { fieldClass, labelClass } from "@/lib/student-profile-form";
import { updateOwnPassword } from "@/app/(athlete)/dashboard/profile-actions";

/** "Alterar senha": exige a senha atual antes de trocar (reautenticação no server action). */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      await updateOwnPassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível alterar a senha.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardTitle>Alterar senha</CardTitle>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <label className="block">
          <span className={labelClass}>Senha atual</span>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Nova senha (mínimo 8 caracteres)</span>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Confirmar nova senha</span>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={fieldClass}
          />
        </label>

        {error && <p className="text-sm text-status-missed">{error}</p>}
        {success && !error && <p className="text-sm text-lime-deep">Senha alterada com sucesso.</p>}

        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </Card>
  );
}
