"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { getPrivateNotes, savePrivateNotes } from "@/app/(coach)/cockpit/notes-actions";
import type { MockStudent } from "@/lib/mock-data";

interface MonitoringTabProps {
  students: MockStudent[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
}

const fieldClass =
  "mt-1 w-full rounded-xl border border-g4-border bg-white p-2.5 text-sm text-g4-ink focus-ring";
const labelClass = "text-xs font-medium text-g4-muted";

/**
 * Aba "Monitoramento do Aluno" (só treinador): status de integração
 * Strava, resumo de volume, tendência de evolução, alerta de overtraining
 * e notas privadas. Só o status do Strava (`student.stravaSynced`) e as
 * notas (persistidas de verdade, tabela própria sem RLS pro aluno) são
 * dado real hoje — os outros três cards mostram um aviso honesto de "sem
 * dados ainda" em vez de números inventados, até existir ingestão real do
 * Strava e histórico suficiente de treinos concluídos.
 */
export function MonitoringTab({ students, selectedStudentId, onSelectStudent }: MonitoringTabProps) {
  const student = students.find((s) => s.id === selectedStudentId) ?? students[0];

  // Notas por aluno, mantidas em memória por id — evita "piscar" texto do
  // aluno anterior ao trocar a seleção e permite derivar o estado de
  // carregamento/"salvo" a partir dos próprios dados, em vez de flags soltas.
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [savedNotesById, setSavedNotesById] = useState<Record<string, string>>({});
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const studentId = student?.id;
  const notesLoaded = studentId !== undefined && Object.prototype.hasOwnProperty.call(notesById, studentId);
  const notes = studentId !== undefined ? (notesById[studentId] ?? "") : "";
  const notesSaved = notesLoaded && savedNotesById[studentId as string] === notes;

  useEffect(() => {
    if (!studentId || notesLoaded) return;
    let cancelled = false;
    getPrivateNotes(studentId)
      .then((value) => {
        if (cancelled) return;
        setNotesById((prev) => ({ ...prev, [studentId]: value }));
        setSavedNotesById((prev) => ({ ...prev, [studentId]: value }));
      })
      .catch((e) => {
        if (!cancelled) setNotesError(e instanceof Error ? e.message : "Não foi possível carregar as notas.");
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, notesLoaded]);

  if (!student) {
    return <p className="text-sm text-g4-muted">Cadastre um aluno para liberar o monitoramento.</p>;
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    setNotesError(null);
    try {
      await savePrivateNotes(student.id, notes);
      setSavedNotesById((prev) => ({ ...prev, [student.id]: notes }));
    } catch (e) {
      setNotesError(e instanceof Error ? e.message : "Não foi possível salvar as notas.");
    } finally {
      setNotesSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <label className="block sm:max-w-sm">
          <span className={labelClass}>Aluno</span>
          <select value={student.id} onChange={(e) => onSelectStudent(e.target.value)} className={fieldClass}>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {/* 1. Status de integração */}
      <Card>
        <CardTitle>Status de integração</CardTitle>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-g4-ink">Strava</p>
          <Badge tone={student.stravaSynced ? "lime" : "neutral"}>
            {student.stravaSynced ? "Conectado" : "Desconectado"}
          </Badge>
        </div>
      </Card>

      {/* 2. Resumo de treinos concluídos */}
      <Card>
        <CardTitle>Resumo de treinos concluídos</CardTitle>
        <p className="mt-2 text-sm text-g4-muted">
          Sem dados do Strava ainda — {student.name} não tem a integração conectada, e ainda não há histórico de
          atividades importadas.
        </p>
      </Card>

      {/* 3. Gráfico de evolução */}
      <Card>
        <CardTitle>Evolução</CardTitle>
        <p className="mt-2 text-sm text-g4-muted">
          Ainda não há dados suficientes pra mostrar uma tendência de carga/pace/FTP — depende do mesmo histórico de
          atividades do card acima.
        </p>
      </Card>

      {/* 4. Alerta de overtraining */}
      <Card>
        <CardTitle>Alerta de overtraining</CardTitle>
        <p className="mt-2 text-sm text-g4-muted">
          Sem dados suficientes pra avaliar risco de overtraining ainda.
        </p>
      </Card>

      {/* 5. Notas do treinador (privadas) */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Notas do treinador</CardTitle>
          <Badge tone="neutral">Privado</Badge>
        </div>
        <p className="mt-1 text-xs text-g4-muted">Só você vê essas notas — o aluno não tem acesso, nem no próprio perfil.</p>

        <textarea
          value={notes}
          onChange={(e) => setNotesById((prev) => ({ ...prev, [student.id]: e.target.value }))}
          disabled={!notesLoaded}
          rows={5}
          placeholder="Dores relatadas, ajustes de carga, observações gerais..."
          className={cn(fieldClass, "mt-3 disabled:opacity-60")}
        />

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Button variant="primary" onClick={handleSaveNotes} disabled={notesSaving || !notesLoaded}>
            {notesSaving ? "Salvando..." : notesSaved ? "Salvo ✓" : "Salvar notas"}
          </Button>
          {!notesLoaded && <span className="text-xs text-g4-muted">Carregando...</span>}
        </div>
        {notesError && <p className="mt-2 text-sm text-status-missed">{notesError}</p>}
      </Card>
    </div>
  );
}
