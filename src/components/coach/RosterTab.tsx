"use client";

import { useState } from "react";
import { AddStudentModal } from "@/components/coach/AddStudentModal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import type { MockStudent } from "@/lib/mock-data";
import type { CreateStudentInput, StudentProfileInput } from "@/app/(coach)/cockpit/students-actions";

interface RosterTabProps {
  students: MockStudent[];
  onAddStudent: (input: CreateStudentInput) => Promise<void>;
  onSaveProfile: (id: string, input: StudentProfileInput) => Promise<void>;
}

function formatFtp(student: MockStudent): string {
  const ftp = student.cycling?.ftpWatts;
  if (ftp == null) return "—";
  if (student.weightKg != null) {
    return `${ftp} W · ${(ftp / student.weightKg).toFixed(2)} W/kg`;
  }
  return `${ftp} W`;
}

/**
 * Aba "Alunos cadastrados": a lista geral de alunos gerenciados (FTP/W-kg,
 * peso, modalidade, status do dia) com o cadastro de um novo aluno (modal
 * completo em AddStudentModal). Fica em memória (useState no CockpitTabs)
 * até a persistência real via Supabase.
 */
export function RosterTab({ students, onAddStudent, onSaveProfile }: RosterTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<MockStudent | null>(null);
  // Incrementa a cada abertura — combinado ao id do aluno na key do modal,
  // força um remount mesmo reabrindo pro mesmo aluno (ou "novo" de novo)
  // logo depois de fechar sem salvar, então o formulário nunca reaparece
  // com dados de uma edição anterior descartada.
  const [openCount, setOpenCount] = useState(0);

  function openNewStudent() {
    setEditingStudent(null);
    setShowForm(true);
    setOpenCount((n) => n + 1);
  }

  function openEditStudent(student: MockStudent) {
    setEditingStudent(student);
    setShowForm(true);
    setOpenCount((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-g4-ink">Alunos cadastrados ({students.length})</h2>
          <p className="text-sm text-g4-muted">Cadastro geral: FTP, peso, modalidade e status do dia.</p>
        </div>
        <Button variant="primary" className="w-full sm:w-auto sm:px-4" onClick={openNewStudent}>
          + Adicionar novo aluno
        </Button>
      </div>

      {/* key muda a cada abertura — remonta o modal do zero, garantindo que
          o formulário nasça com os dados certos sem precisar de um
          useEffect só pra resetar estado. */}
      <AddStudentModal
        key={`${editingStudent?.id ?? "new"}:${openCount}`}
        open={showForm}
        onClose={() => setShowForm(false)}
        onAddStudent={onAddStudent}
        editingStudent={editingStudent}
        onSaveProfile={onSaveProfile}
      />

      {/* Celular: cards empilhados — a tabela larga (6 colunas) esconderia FTP,
          peso e Strava sem indicação de rolagem. */}
      <div className="flex flex-col gap-4 sm:hidden">
        {students.map((student) => (
          <Card key={student.id} className="p-4">
            <div className="flex items-center gap-4">
              <Avatar name={student.name} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-g4-ink">{student.name}</p>
                <p className="text-xs text-g4-muted">{student.phone}</p>
              </div>
              <StatusDot status={student.todayStatus} showLabel={false} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <p className="text-g4-muted">
                Modalidade <span className="text-g4-ink">{student.discipline}</span>
              </p>
              <p className="text-g4-muted">
                FTP <span className="text-g4-ink">{formatFtp(student)}</span>
              </p>
              <p className="text-g4-muted">
                Peso <span className="text-g4-ink">{student.weightKg != null ? `${student.weightKg} kg` : "—"}</span>
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <StatusDot status={student.todayStatus} />
              <Badge tone={student.stravaSynced ? "lime" : "neutral"}>
                {student.stravaSynced ? "Strava sincronizado" : "Strava não conectado"}
              </Badge>
              {!student.profileComplete && <Badge tone="danger">Ficha incompleta</Badge>}
            </div>
            <Button
              variant="secondary"
              className="mt-3 w-full"
              onClick={() => openEditStudent(student)}
            >
              {student.profileComplete ? "Editar ficha" : "Completar ficha"}
            </Button>
          </Card>
        ))}
      </div>

      {/* Desktop/tablet: tabela completa, cabe sem rolagem no espaço disponível. */}
      <Card className="hidden overflow-hidden p-0 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-g4-surface-alt text-g4-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Aluno</th>
              <th className="px-5 py-3 font-medium">Modalidade</th>
              <th className="px-5 py-3 font-medium">FTP</th>
              <th className="px-5 py-3 font-medium">Peso</th>
              <th className="px-5 py-3 font-medium">Status do dia</th>
              <th className="px-5 py-3 font-medium">Strava</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-g4-border">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-4">
                    <Avatar name={student.name} className="h-9 w-9" />
                    <div>
                      <p className="font-medium text-g4-ink">{student.name}</p>
                      <p className="text-xs text-g4-muted">{student.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-g4-muted">
                  {student.profileComplete ? student.discipline : <Badge tone="danger">Ficha incompleta</Badge>}
                </td>
                <td className="px-5 py-3 text-g4-muted">{formatFtp(student)}</td>
                <td className="px-5 py-3 text-g4-muted">
                  {student.weightKg != null ? `${student.weightKg} kg` : "—"}
                </td>
                <td className="px-5 py-3">
                  <StatusDot status={student.todayStatus} />
                </td>
                <td className="px-5 py-3">
                  <Badge tone={student.stravaSynced ? "lime" : "neutral"}>
                    {student.stravaSynced ? "Sincronizado" : "Não conectado"}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => openEditStudent(student)}>
                    {student.profileComplete ? "Editar ficha" : "Completar ficha"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
