"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ExerciseSet, PrescribedExercise, SetPreset, TrainingSession } from "@/lib/supabase/types";

interface ExercisePrescriptionEditorProps {
  sessions: TrainingSession[];
  onChange: (sessions: TrainingSession[]) => void;
  presets: SetPreset[];
  onPresetsChange: (presets: SetPreset[]) => void;
}

const fieldClass =
  "mt-1 w-full rounded-lg border border-g4-border bg-white p-2 text-sm text-g4-ink focus-ring";
const miniLabelClass =
  "block text-[11px] font-semibold uppercase tracking-wide text-g4-muted lg:whitespace-nowrap";

const EMPTY_SET: ExerciseSet = { reps: "", load: "", restSeconds: 60 };

function emptyExercise(): PrescribedExercise {
  return { name: "", videoUrl: null, sets: [{ ...EMPTY_SET }] };
}

function emptySession(index: number): TrainingSession {
  return { name: `Treino ${index + 1}`, exercises: [emptyExercise()] };
}

/**
 * Editor de treinos de Academia — vários treinos nomeados por plano
 * (reordenáveis), cada um com exercícios (nome + vídeo demonstrativo) e
 * séries (série/rep, carga, intervalo em texto livre, como nos apps de
 * musculação de referência). Mesmo padrão de update/remove/add-row do
 * IntervalEditor, só que aninhado em 3 níveis (treino → exercício → série).
 */
export function ExercisePrescriptionEditor({
  sessions,
  onChange,
  presets,
  onPresetsChange,
}: ExercisePrescriptionEditorProps) {
  function updateSession(index: number, patch: Partial<TrainingSession>) {
    onChange(sessions.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeSession(index: number) {
    onChange(sessions.filter((_, i) => i !== index));
  }

  function addSession() {
    onChange([...sessions, emptySession(sessions.length)]);
  }

  function moveSession(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sessions.length) return;
    const next = [...sessions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function updateExercise(sessionIndex: number, exerciseIndex: number, patch: Partial<PrescribedExercise>) {
    const session = sessions[sessionIndex];
    updateSession(sessionIndex, {
      exercises: session.exercises.map((ex, i) => (i === exerciseIndex ? { ...ex, ...patch } : ex)),
    });
  }

  function removeExercise(sessionIndex: number, exerciseIndex: number) {
    const session = sessions[sessionIndex];
    updateSession(sessionIndex, {
      exercises: session.exercises.filter((_, i) => i !== exerciseIndex),
    });
  }

  function addExercise(sessionIndex: number) {
    const session = sessions[sessionIndex];
    updateSession(sessionIndex, { exercises: [...session.exercises, emptyExercise()] });
  }

  return (
    <div className="mt-3 flex flex-col gap-4">
      {sessions.map((session, sessionIndex) => (
        <div
          key={sessionIndex}
          className="rounded-2xl border border-g4-border bg-g4-surface-alt/60 p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-4">
            <input
              value={session.name}
              onChange={(e) => updateSession(sessionIndex, { name: e.target.value })}
              className="min-w-0 flex-1 rounded-lg border border-g4-border bg-white p-2 text-sm font-semibold text-g4-ink focus-ring"
              placeholder="Nome do treino"
            />
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => moveSession(sessionIndex, -1)}
                disabled={sessionIndex === 0}
                aria-label="Mover treino para cima"
                className="rounded-lg border border-g4-border px-2 py-1 text-xs text-g4-muted hover:bg-white disabled:opacity-40"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveSession(sessionIndex, 1)}
                disabled={sessionIndex === sessions.length - 1}
                aria-label="Mover treino para baixo"
                className="rounded-lg border border-g4-border px-2 py-1 text-xs text-g4-muted hover:bg-white disabled:opacity-40"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => removeSession(sessionIndex)}
                className="rounded-lg border border-status-missed/30 px-2 py-1 text-xs font-medium text-status-missed hover:bg-status-missed/10"
              >
                Remover treino
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {session.exercises.map((exercise, exerciseIndex) => (
              <ExerciseRow
                key={exerciseIndex}
                exercise={exercise}
                presets={presets}
                onChange={(patch) => updateExercise(sessionIndex, exerciseIndex, patch)}
                onSetsChange={(sets) => updateExercise(sessionIndex, exerciseIndex, { sets })}
                onRemove={() => removeExercise(sessionIndex, exerciseIndex)}
                onSavePreset={(preset) => onPresetsChange([...presets, preset])}
              />
            ))}
          </div>

          <Button variant="secondary" className="mt-4 px-4 text-sm" onClick={() => addExercise(sessionIndex)}>
            + Adicionar exercício
          </Button>
        </div>
      ))}

      <Button variant="secondary" className="px-4 text-sm" onClick={addSession}>
        + Adicionar treino
      </Button>

      {sessions.length === 0 && (
        <p className="text-xs text-g4-muted">
          Nenhum treino cadastrado — adicione ao menos um para montar a prescrição de Academia.
        </p>
      )}
    </div>
  );
}

interface ExerciseRowProps {
  exercise: PrescribedExercise;
  presets: SetPreset[];
  onChange: (patch: Partial<PrescribedExercise>) => void;
  onSetsChange: (sets: ExerciseSet[]) => void;
  onRemove: () => void;
  onSavePreset: (preset: SetPreset) => void;
}

function ExerciseRow({ exercise, presets, onChange, onSetsChange, onRemove, onSavePreset }: ExerciseRowProps) {
  const [presetToApply, setPresetToApply] = useState("");
  const [savingPresetForRow, setSavingPresetForRow] = useState<number | null>(null);
  const [presetName, setPresetName] = useState("");

  function updateSetRow(index: number, patch: Partial<ExerciseSet>) {
    onSetsChange(exercise.sets.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeSetRow(index: number) {
    onSetsChange(exercise.sets.filter((_, i) => i !== index));
  }

  function addSetRow() {
    onSetsChange([...exercise.sets, { ...EMPTY_SET }]);
  }

  function replicateLastSet() {
    const last = exercise.sets[exercise.sets.length - 1];
    onSetsChange([...exercise.sets, last ? { ...last } : { ...EMPTY_SET }]);
  }

  function applyPreset() {
    const preset = presets.find((p) => p.id === presetToApply);
    if (!preset) return;
    onSetsChange([...exercise.sets, { reps: preset.reps, load: preset.load, restSeconds: preset.restSeconds }]);
  }

  function confirmSavePreset(index: number) {
    const name = presetName.trim();
    if (!name) return;
    const row = exercise.sets[index];
    onSavePreset({
      id: crypto.randomUUID(),
      name,
      reps: row.reps,
      load: row.load,
      restSeconds: row.restSeconds,
    });
    setSavingPresetForRow(null);
    setPresetName("");
  }

  return (
    <div className="rounded-xl border border-g4-border bg-white p-3">
      <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className={miniLabelClass}>Exercício</span>
          <input
            value={exercise.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={fieldClass}
            placeholder="Ex.: Remo"
          />
        </label>
        <label className="block">
          <span className={miniLabelClass}>Link do vídeo</span>
          <input
            type="url"
            value={exercise.videoUrl ?? ""}
            onChange={(e) => onChange({ videoUrl: e.target.value || null })}
            className={fieldClass}
            placeholder="https://..."
          />
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="justify-self-start rounded-lg border border-status-missed/30 px-3 py-2 text-xs font-medium text-status-missed hover:bg-status-missed/10 sm:justify-self-end"
        >
          Remover exercício
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {exercise.sets.map((set, index) => (
          <div key={index} className="rounded-lg border border-g4-border bg-g4-surface-alt/40 p-3">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
              <label className="block">
                <span className={miniLabelClass}>Série/rep</span>
                <input
                  value={set.reps}
                  onChange={(e) => updateSetRow(index, { reps: e.target.value })}
                  className={fieldClass}
                  placeholder="4x8"
                />
              </label>
              <label className="block">
                <span className={miniLabelClass}>Carga</span>
                <input
                  value={set.load}
                  onChange={(e) => updateSetRow(index, { load: e.target.value })}
                  className={fieldClass}
                  placeholder="média"
                />
              </label>
              <label className="block">
                <span className={miniLabelClass}>Intervalo (s)</span>
                <input
                  type="number"
                  min={0}
                  value={set.restSeconds}
                  onChange={(e) => updateSetRow(index, { restSeconds: Math.max(0, Number(e.target.value)) })}
                  className={fieldClass}
                />
              </label>
              <button
                type="button"
                onClick={() => removeSetRow(index)}
                aria-label="Remover série"
                className="col-span-3 rounded-lg border border-status-missed/30 px-2 py-2 text-xs font-medium text-status-missed hover:bg-status-missed/10 sm:col-span-1"
              >
                Remover
              </button>
            </div>

            {savingPresetForRow === index ? (
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Nome do preset"
                  className="min-w-0 flex-1 rounded-lg border border-g4-border bg-white p-2 text-sm text-g4-ink focus-ring"
                />
                <Button variant="primary" className="px-3 py-1.5 text-xs" onClick={() => confirmSavePreset(index)}>
                  Salvar
                </Button>
                <Button
                  variant="ghost"
                  className="px-3 py-1.5 text-xs"
                  onClick={() => {
                    setSavingPresetForRow(null);
                    setPresetName("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSavingPresetForRow(index)}
                className="mt-3 text-xs font-medium text-lime-deep hover:underline"
              >
                Salvar como preset
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={addSetRow}>
          + Adicionar série
        </Button>
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={replicateLastSet}>
          Replicar séries
        </Button>

        {presets.length > 0 && (
          <div className="flex items-center gap-4">
            <select
              value={presetToApply}
              onChange={(e) => setPresetToApply(e.target.value)}
              className="rounded-lg border border-g4-border bg-white p-2 text-xs text-g4-ink focus-ring"
            >
              <option value="">Escolher preset...</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              onClick={applyPreset}
              disabled={!presetToApply}
            >
              Adicionar preset
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
