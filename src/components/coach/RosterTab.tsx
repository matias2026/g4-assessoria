"use client";

import { useState, type FormEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import type { MockStudent } from "@/lib/mock-data";

interface RosterTabProps {
  students: MockStudent[];
  onAddStudent: (student: MockStudent) => void;
}

const DISCIPLINES = ["Ciclismo", "Corrida", "Academia"];

const fieldClass =
  "mt-1 w-full rounded-xl border border-g4-border bg-white p-2.5 text-sm text-g4-ink focus-ring";
const labelClass = "text-xs font-medium text-g4-muted";

/**
 * Aba "Alunos cadastrados": a lista geral de alunos gerenciados (FTP, peso,
 * modalidade, status do dia) com o cadastro de um novo aluno. Fica em
 * memória (useState no CockpitTabs) até a persistência real via Supabase.
 */
export function RosterTab({ students, onAddStudent }: RosterTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [discipline, setDiscipline] = useState(DISCIPLINES[0]);
  const [ftp, setFtp] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [zones, setZones] = useState("");

  function resetForm() {
    setName("");
    setPhone("");
    setDiscipline(DISCIPLINES[0]);
    setFtp("");
    setWeight("");
    setHeight("");
    setZones("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    onAddStudent({
      id: String(Date.now()),
      name: name.trim(),
      phone: phone.trim(),
      discipline,
      ftpWatts: ftp.trim() === "" ? null : Number(ftp),
      weightKg: weight.trim() === "" ? null : Number(weight),
      heightCm: height.trim() === "" ? null : Number(height),
      zonesSummary: zones.trim(),
      todayStatus: "pending",
      stravaSynced: false,
      lastActivity: null,
    });

    resetForm();
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-g4-ink">Alunos cadastrados ({students.length})</h2>
          <p className="text-sm text-g4-muted">Cadastro geral: FTP, peso, modalidade e status do dia.</p>
        </div>
        <Button variant="primary" className="px-4" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Adicionar novo aluno"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardTitle>Novo aluno</CardTitle>
          <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Nome</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={fieldClass}
                placeholder="Nome completo"
              />
            </label>
            <label className="block">
              <span className={labelClass}>WhatsApp</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className={fieldClass}
                placeholder="+55 84 99999-0000"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Modalidade</span>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className={fieldClass}
              >
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>FTP (watts)</span>
              <input
                type="number"
                min={0}
                value={ftp}
                onChange={(e) => setFtp(e.target.value)}
                className={fieldClass}
                placeholder="Ex.: 260"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Peso (kg)</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Altura (cm)</span>
              <input
                type="number"
                min={0}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Zonas (FTP/FC)</span>
              <input
                value={zones}
                onChange={(e) => setZones(e.target.value)}
                className={fieldClass}
                placeholder="Ex.: Z1 <150W · Z2 150-200W · Z3 201-225W · Z4 226-250W · Z5 251W+"
              />
            </label>

            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" className="px-5">
                Salvar aluno
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Celular: cards empilhados — a tabela larga (6 colunas) esconderia FTP,
          peso e Strava sem indicação de rolagem. */}
      <div className="flex flex-col gap-3 sm:hidden">
        {students.map((student) => (
          <Card key={student.id} className="p-4">
            <div className="flex items-center gap-3">
              <Avatar name={student.name} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-g4-ink">{student.name}</p>
                <p className="text-xs text-g4-muted">{student.phone}</p>
              </div>
              <StatusDot status={student.todayStatus} showLabel={false} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <p className="text-g4-muted">
                Modalidade <span className="text-g4-ink">{student.discipline}</span>
              </p>
              <p className="text-g4-muted">
                FTP <span className="text-g4-ink">{student.ftpWatts != null ? `${student.ftpWatts} W` : "—"}</span>
              </p>
              <p className="text-g4-muted">
                Peso <span className="text-g4-ink">{student.weightKg != null ? `${student.weightKg} kg` : "—"}</span>
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <StatusDot status={student.todayStatus} />
              <Badge tone={student.stravaSynced ? "lime" : "neutral"}>
                {student.stravaSynced ? "Strava sincronizado" : "Strava não conectado"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop/tablet: tabela completa. */}
      <Card className="hidden overflow-hidden p-0 sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-g4-surface-alt text-g4-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Aluno</th>
                <th className="px-5 py-3 font-medium">Modalidade</th>
                <th className="px-5 py-3 font-medium">FTP</th>
                <th className="px-5 py-3 font-medium">Peso</th>
                <th className="px-5 py-3 font-medium">Status do dia</th>
                <th className="px-5 py-3 font-medium">Strava</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-g4-border">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={student.name} className="h-9 w-9" />
                      <div>
                        <p className="font-medium text-g4-ink">{student.name}</p>
                        <p className="text-xs text-g4-muted">{student.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-g4-muted">{student.discipline}</td>
                  <td className="px-5 py-3 text-g4-muted">
                    {student.ftpWatts != null ? `${student.ftpWatts} W` : "—"}
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
