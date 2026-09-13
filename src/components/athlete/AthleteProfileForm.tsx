"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { StudentProfileFields } from "@/components/shared/StudentProfileFields";
import type { MockStudent } from "@/lib/mock-data";
import {
  buildProfileInput,
  cyclingFieldsFromStudent,
  generalFieldsFromStudent,
  runningFieldsFromStudent,
  strengthFieldsFromStudent,
  type CyclingFields,
  type GeneralFields,
  type RunningFields,
  type StrengthFields,
} from "@/lib/student-profile-form";
import { updateOwnProfile } from "@/app/(athlete)/dashboard/profile-actions";

interface AthleteProfileFormProps {
  student: MockStudent;
}

/**
 * "Minha ficha": o próprio aluno completa/edita os dados corporais e por
 * modalidade — mesmos campos que o treinador vê em AddStudentModal
 * (StudentProfileFields compartilhado), sem e-mail/senha (login já existe,
 * ver "Alterar senha" em /dashboard/senha) e sem o comentário do
 * treinador (só ele escreve isso, em "Relatório do treinador").
 */
export function AthleteProfileForm({ student }: AthleteProfileFormProps) {
  const [general, setGeneral] = useState<GeneralFields>(() => generalFieldsFromStudent(student));
  const [primaryDiscipline, setPrimaryDiscipline] = useState(student.discipline);
  const [secondaryDisciplines, setSecondaryDisciplines] = useState<string[]>(student.secondaryDisciplines);
  const [cycling, setCycling] = useState<CyclingFields>(() => cyclingFieldsFromStudent(student));
  const [running, setRunning] = useState<RunningFields>(() => runningFieldsFromStudent(student));
  const [strength, setStrength] = useState<StrengthFields>(() => strengthFieldsFromStudent(student));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handlePrimaryChange(next: string) {
    setPrimaryDiscipline(next);
    setSecondaryDisciplines((prev) => prev.filter((d) => d !== next));
  }

  function toggleSecondary(discipline: string) {
    setSecondaryDisciplines((prev) =>
      prev.includes(discipline) ? prev.filter((d) => d !== discipline) : [...prev, discipline]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!general.name.trim() || !general.phone.trim()) return;

    const profileInput = buildProfileInput(
      general,
      { primaryDiscipline, secondaryDisciplines },
      cycling,
      running,
      strength,
      student.coachNotes
    );

    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await updateOwnProfile(profileInput);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar sua ficha.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardTitle>Minha ficha</CardTitle>
      <p className="mt-1 text-sm text-g4-muted">
        Mantenha seus dados atualizados — seu treinador usa isso pra ajustar o treino.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <StudentProfileFields
          general={general}
          onPatchGeneral={(patch) => setGeneral((prev) => ({ ...prev, ...patch }))}
          primaryDiscipline={primaryDiscipline}
          secondaryDisciplines={secondaryDisciplines}
          onChangePrimaryDiscipline={handlePrimaryChange}
          onToggleSecondaryDiscipline={toggleSecondary}
          cycling={cycling}
          onPatchCycling={(patch) => setCycling((prev) => ({ ...prev, ...patch }))}
          running={running}
          onPatchRunning={(patch) => setRunning((prev) => ({ ...prev, ...patch }))}
          strength={strength}
          onPatchStrength={(patch) => setStrength((prev) => ({ ...prev, ...patch }))}
        />

        {error && <p className="text-sm text-status-missed">{error}</p>}
        {saved && !error && <p className="text-sm text-lime-deep">Ficha salva com sucesso.</p>}

        <Button type="submit" variant="primary" className="mt-1" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar minha ficha"}
        </Button>
      </form>
    </Card>
  );
}
