"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { StudentProfileFields } from "@/components/shared/StudentProfileFields";
import type { MockStudent } from "@/lib/mock-data";
import {
  BLANK_CYCLING,
  BLANK_GENERAL,
  BLANK_RUNNING,
  BLANK_STRENGTH,
  DISCIPLINES,
  buildProfileInput,
  cyclingFieldsFromStudent,
  fieldClass,
  generalFieldsFromStudent,
  labelClass,
  runningFieldsFromStudent,
  sectionClass,
  strengthFieldsFromStudent,
  summaryClass,
  type CyclingFields,
  type GeneralFields,
  type RunningFields,
  type StrengthFields,
} from "@/lib/student-profile-form";
import type { CreateStudentInput, StudentProfileInput } from "@/app/(coach)/cockpit/students-actions";

interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
  onAddStudent: (input: CreateStudentInput) => Promise<void>;
  // Quando presente, o modal edita a ficha desse aluno em vez de criar
  // conta nova — sem e-mail/senha (o login já existe) e chamando
  // onSaveProfile no lugar de onAddStudent.
  editingStudent?: MockStudent | null;
  onSaveProfile?: (id: string, input: StudentProfileInput) => Promise<void>;
}

/**
 * Modal de cadastro/edição de aluno: dados corporais gerais + seções
 * específicas por modalidade (campos compartilhados com o autoatendimento
 * do aluno via StudentProfileFields), mais e-mail/senha (só ao criar
 * conta nova) e o comentário geral do treinador (só ao editar). TODO:
 * substituir onAddStudent por leitura real quando cockpit/page.tsx buscar
 * a lista de alunos por Supabase (já feito) — este modal só falta migrar
 * o resto do fluxo de prescrição.
 */
export function AddStudentModal({
  open,
  onClose,
  onAddStudent,
  editingStudent,
  onSaveProfile,
}: AddStudentModalProps) {
  // Estado inicial lazy a partir do aluno em edição (ou em branco, pra
  // cadastro novo) — o pai remonta este componente (key trocando) toda vez
  // que o modal abre pra um aluno diferente, então isso já resolve sozinho
  // sem precisar de um useEffect só pra "resetar" o formulário.
  const [general, setGeneral] = useState<GeneralFields>(() =>
    editingStudent ? generalFieldsFromStudent(editingStudent) : BLANK_GENERAL
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [coachNotes, setCoachNotes] = useState(() => editingStudent?.coachNotes ?? "");
  const [primaryDiscipline, setPrimaryDiscipline] = useState(() => editingStudent?.discipline ?? DISCIPLINES[0]);
  const [secondaryDisciplines, setSecondaryDisciplines] = useState<string[]>(
    () => editingStudent?.secondaryDisciplines ?? []
  );
  const [cycling, setCycling] = useState<CyclingFields>(() =>
    editingStudent ? cyclingFieldsFromStudent(editingStudent) : BLANK_CYCLING
  );
  const [running, setRunning] = useState<RunningFields>(() =>
    editingStudent ? runningFieldsFromStudent(editingStudent) : BLANK_RUNNING
  );
  const [strength, setStrength] = useState<StrengthFields>(() =>
    editingStudent ? strengthFieldsFromStudent(editingStudent) : BLANK_STRENGTH
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

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
    const missingAccountFields = !editingStudent && (!email.trim() || !password);
    if (!general.name.trim() || !general.phone.trim() || missingAccountFields) return;

    const profileInput = buildProfileInput(
      general,
      { primaryDiscipline, secondaryDisciplines },
      cycling,
      running,
      strength,
      coachNotes.trim()
    );

    setError(null);
    setSubmitting(true);
    try {
      if (editingStudent) {
        await onSaveProfile?.(editingStudent.id, profileInput);
      } else {
        await onAddStudent({ ...profileInput, email: email.trim(), password });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar a ficha do aluno.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editingStudent ? "Completar ficha do aluno" : "Cadastrar novo aluno"}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-g4-surface shadow-lg sm:max-w-2xl sm:rounded-2xl"
      >
        {/* Cabeçalho fixo (fora da área de rolagem) — em vez de rolar junto
            com o formulário, o que fazia o título sumir/cortar no topo
            (pior ainda com a barra do Safari no iOS). */}
        <div className="flex shrink-0 items-center justify-between border-b border-g4-border p-5">
          <h2 className="text-lg font-bold text-g4-ink">
            {editingStudent
              ? `${editingStudent.profileComplete ? "Editar" : "Completar"} ficha — ${editingStudent.name}`
              : "Novo aluno"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg px-2 py-1 text-g4-muted hover:bg-g4-surface-alt"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-5">
          {/* Login já existe na edição — o aluno aprovado por
              /solicitar-acesso escolheu a própria senha; e-mail/senha só
              fazem sentido ao criar a conta pela primeira vez. */}
          {!editingStudent && (
            <div className={sectionClass}>
              <p className={summaryClass}>Acesso</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>E-mail (login do aluno)</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={fieldClass}
                    placeholder="aluno@exemplo.com"
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Senha (mínimo 8 caracteres)</span>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className={fieldClass}
                    placeholder="Senha provisória"
                  />
                </label>
              </div>
            </div>
          )}

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

          {/* Só existe alguém pra comentar sobre quando o aluno já existe —
              não faz sentido no formulário de conta nova. */}
          {editingStudent && (
            <details open className={sectionClass}>
              <summary className={summaryClass}>Relatório do treinador</summary>
              <label className="mt-3 block">
                <span className={labelClass}>
                  Comentário geral sobre o aluno (visível pra ele em &quot;Meu perfil&quot;)
                </span>
                <textarea
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  rows={4}
                  className={fieldClass}
                  placeholder="Ex.: vem evoluindo bem na parte aeróbica, atenção à recuperação entre os treinos de força..."
                />
              </label>
            </details>
          )}

          {error && <p className="text-sm text-status-missed">{error}</p>}

          <Button type="submit" variant="primary" className="mt-1" disabled={submitting}>
            {submitting
              ? editingStudent
                ? "Salvando..."
                : "Criando conta..."
              : editingStudent
                ? "Salvar ficha"
                : "Salvar aluno"}
          </Button>
        </form>
      </div>
    </div>
  );
}
