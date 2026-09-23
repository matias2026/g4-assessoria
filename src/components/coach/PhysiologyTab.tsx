"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { MockStudent } from "@/lib/mock-data";
import {
  createPhysiologyAssessment,
  deletePhysiologyAssessment,
  getPhysiologyAssessment,
  listPhysiologyAssessments,
  savePhysiologyAssessment,
  type PhysiologyAssessmentDetail,
  type PhysiologyAssessmentSummary,
  type PhysiologyStage,
  type TipoTeste,
} from "@/app/(coach)/cockpit/physiology-actions";

interface PhysiologyTabProps {
  students: MockStudent[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
}

const fieldClass = "mt-1 w-full rounded-xl border border-g4-border bg-g4-surface p-2.5 text-sm text-g4-ink focus-ring";
const labelClass = "text-xs font-medium text-g4-muted";

const TIPO_TESTE_LABEL: Record<TipoTeste, string> = { ciclismo: "Ciclismo", corrida: "Corrida", outro: "Outro" };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyStage(estagioNumero: number): Omit<PhysiologyStage, "id"> {
  return {
    estagioNumero,
    tempoMinutos: null,
    potenciaWatts: null,
    pace: null,
    glicemia: null,
    fcBpm: null,
    lactatoMmol: null,
    pse: null,
  };
}

// Converte pro tipo certo (número ou null) o valor digitado num campo —
// string vazia sempre vira null, nunca 0 (0 mmol/L de lactato é um valor
// real, diferente de "não preenchido ainda").
function parseNumberOrNull(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

/**
 * Aba "Fisiologia": avaliação de limiar de lactato/glicemia — registro dos
 * estágios de um teste incremental (potência ou pace, glicemia, FC,
 * lactato, PSE), gráfico da curva de lactato e os limiares LT1/LT2
 * marcados manualmente pelo treinador sobre o gráfico. Primeira versão
 * enxuta: sem detecção automática de limiar, sem parecer por IA, sem
 * HRV/PDF — só o registro e a visualização, que já é o que falta pra
 * substituir uma planilha solta.
 */
export function PhysiologyTab({ students, selectedStudentId, onSelectStudent }: PhysiologyTabProps) {
  const student = students.find((s) => s.id === selectedStudentId) ?? students[0];
  const studentId = student?.id;

  const [assessmentsByStudent, setAssessmentsByStudent] = useState<Record<string, PhysiologyAssessmentSummary[]>>({});
  const [listError, setListError] = useState<string | null>(null);

  const [openAssessment, setOpenAssessment] = useState<PhysiologyAssessmentDetail | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const assessmentsLoaded = studentId !== undefined && Object.prototype.hasOwnProperty.call(assessmentsByStudent, studentId);
  const assessments = studentId !== undefined ? (assessmentsByStudent[studentId] ?? []) : [];

  useEffect(() => {
    if (!studentId || assessmentsLoaded) return;
    let cancelled = false;
    listPhysiologyAssessments(studentId)
      .then((value) => {
        if (cancelled) return;
        setAssessmentsByStudent((prev) => ({ ...prev, [studentId]: value }));
      })
      .catch((e) => {
        if (!cancelled) setListError(e instanceof Error ? e.message : "Não foi possível carregar as avaliações.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function handleOpen(assessmentId: string) {
    setOpenError(null);
    try {
      const detail = await getPhysiologyAssessment(assessmentId);
      setOpenAssessment(detail);
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : "Não foi possível abrir a avaliação.");
    }
  }

  async function handleCreate() {
    if (!studentId) return;
    setCreating(true);
    setOpenError(null);
    try {
      const created = await createPhysiologyAssessment(studentId, { dataAvaliacao: todayIso(), tipoTeste: "ciclismo" });
      setAssessmentsByStudent((prev) => ({
        ...prev,
        [studentId]: [
          { id: created.id, dataAvaliacao: created.dataAvaliacao, tipoTeste: created.tipoTeste, lt1Potencia: null, lt1Fc: null, lt2Potencia: null, lt2Fc: null },
          ...(prev[studentId] ?? []),
        ],
      }));
      setOpenAssessment(created);
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : "Não foi possível criar a avaliação.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(assessmentId: string) {
    if (!studentId) return;
    setDeleting(true);
    try {
      await deletePhysiologyAssessment(assessmentId);
      setAssessmentsByStudent((prev) => ({ ...prev, [studentId]: (prev[studentId] ?? []).filter((a) => a.id !== assessmentId) }));
      if (openAssessment?.id === assessmentId) setOpenAssessment(null);
      setConfirmingDeleteId(null);
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : "Não foi possível excluir a avaliação.");
    } finally {
      setDeleting(false);
    }
  }

  function updateOpenAssessment(patch: Partial<PhysiologyAssessmentDetail>) {
    setOpenAssessment((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function updateStage(index: number, patch: Partial<PhysiologyStage>) {
    setOpenAssessment((prev) => {
      if (!prev) return prev;
      const stages = prev.stages.map((stage, i) => (i === index ? { ...stage, ...patch } : stage));
      return { ...prev, stages };
    });
  }

  function addStage() {
    setOpenAssessment((prev) => {
      if (!prev) return prev;
      const nextNumber = prev.stages.length > 0 ? Math.max(...prev.stages.map((s) => s.estagioNumero)) + 1 : 1;
      return { ...prev, stages: [...prev.stages, { id: null, ...emptyStage(nextNumber) }] };
    });
  }

  function removeStage(index: number) {
    setOpenAssessment((prev) => (prev ? { ...prev, stages: prev.stages.filter((_, i) => i !== index) } : prev));
  }

  async function handleSave() {
    if (!openAssessment || !studentId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await savePhysiologyAssessment(openAssessment.id, {
        dataAvaliacao: openAssessment.dataAvaliacao,
        tipoTeste: openAssessment.tipoTeste,
        observacoes: openAssessment.observacoes,
        lt1Potencia: openAssessment.lt1Potencia,
        lt1Fc: openAssessment.lt1Fc,
        lt2Potencia: openAssessment.lt2Potencia,
        lt2Fc: openAssessment.lt2Fc,
        stages: openAssessment.stages.map(({ id: _id, ...rest }) => rest),
      });
      setAssessmentsByStudent((prev) => ({
        ...prev,
        [studentId]: (prev[studentId] ?? []).map((a) =>
          a.id === openAssessment.id
            ? {
                id: a.id,
                dataAvaliacao: openAssessment.dataAvaliacao,
                tipoTeste: openAssessment.tipoTeste,
                lt1Potencia: openAssessment.lt1Potencia,
                lt1Fc: openAssessment.lt1Fc,
                lt2Potencia: openAssessment.lt2Potencia,
                lt2Fc: openAssessment.lt2Fc,
              }
            : a
        ),
      }));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Não foi possível salvar a avaliação.");
    } finally {
      setSaving(false);
    }
  }

  if (!student) {
    return <p className="text-sm text-g4-muted">Cadastre um aluno para liberar a aba de fisiologia.</p>;
  }

  const chartData = openAssessment
    ? openAssessment.stages
        .filter((s) => s.lactatoMmol != null)
        .map((s) => ({ x: s.potenciaWatts ?? s.tempoMinutos ?? s.estagioNumero, lactato: s.lactatoMmol, glicemia: s.glicemia }))
    : [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <label className="block sm:max-w-sm">
          <span className={labelClass}>Aluno</span>
          <select
            value={student.id}
            onChange={(e) => {
              setOpenAssessment(null);
              setOpenError(null);
              onSelectStudent(e.target.value);
            }}
            className={fieldClass}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {!openAssessment && (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Avaliações fisiológicas</CardTitle>
            <Button variant="primary" className="px-3 py-1.5 text-xs" onClick={handleCreate} disabled={creating}>
              {creating ? "Criando..." : "+ Nova avaliação"}
            </Button>
          </div>
          {listError && <p className="mt-2 text-sm text-status-missed">{listError}</p>}
          {openError && <p className="mt-2 text-sm text-status-missed">{openError}</p>}
          {!assessmentsLoaded ? (
            <p className="mt-2 text-sm text-g4-muted">Carregando...</p>
          ) : assessments.length === 0 ? (
            <p className="mt-2 text-sm text-g4-muted">Nenhuma avaliação registrada ainda.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-4">
              {assessments.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-4 rounded-xl border border-g4-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-g4-ink">
                      {new Date(`${a.dataAvaliacao}T00:00:00`).toLocaleDateString("pt-BR")} ·{" "}
                      <Badge tone="neutral">{TIPO_TESTE_LABEL[a.tipoTeste]}</Badge>
                    </p>
                    <p className="mt-1 text-xs text-g4-muted">
                      {a.lt1Potencia != null || a.lt1Fc != null ? (
                        <>LT1: {a.lt1Potencia != null ? `${a.lt1Potencia} W` : ""} {a.lt1Fc != null ? `${a.lt1Fc} bpm` : ""}</>
                      ) : (
                        "LT1 não marcado"
                      )}
                      {" · "}
                      {a.lt2Potencia != null || a.lt2Fc != null ? (
                        <>LT2: {a.lt2Potencia != null ? `${a.lt2Potencia} W` : ""} {a.lt2Fc != null ? `${a.lt2Fc} bpm` : ""}</>
                      ) : (
                        "LT2 não marcado"
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => handleOpen(a.id)}>
                      Abrir
                    </Button>
                    {confirmingDeleteId === a.id ? (
                      <span className="flex items-center gap-4 text-xs">
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id)}
                          disabled={deleting}
                          className="font-semibold text-status-missed underline underline-offset-2 focus-ring disabled:opacity-60"
                        >
                          {deleting ? "Excluindo..." : "Confirmar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          className="text-g4-muted underline underline-offset-2 focus-ring"
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(a.id)}
                        className="text-xs text-g4-muted underline underline-offset-2 focus-ring"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {openAssessment && (
        <>
          <Card>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Dados da avaliação</CardTitle>
              <button
                type="button"
                onClick={() => setOpenAssessment(null)}
                className="text-xs font-semibold text-g4-muted underline underline-offset-2 focus-ring"
              >
                ← Voltar
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <label>
                <span className={labelClass}>Data</span>
                <input
                  type="date"
                  value={openAssessment.dataAvaliacao}
                  onChange={(e) => updateOpenAssessment({ dataAvaliacao: e.target.value })}
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Tipo de teste</span>
                <select
                  value={openAssessment.tipoTeste}
                  onChange={(e) => updateOpenAssessment({ tipoTeste: e.target.value as TipoTeste })}
                  className={fieldClass}
                >
                  {(Object.keys(TIPO_TESTE_LABEL) as TipoTeste[]).map((t) => (
                    <option key={t} value={t}>
                      {TIPO_TESTE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 block">
              <span className={labelClass}>Observações</span>
              <textarea
                rows={2}
                value={openAssessment.observacoes}
                onChange={(e) => updateOpenAssessment({ observacoes: e.target.value })}
                className={fieldClass}
              />
            </label>
          </Card>

          {(student.cycling?.ftpWatts != null ||
            student.cycling?.hrMax != null ||
            student.running?.hrMax != null ||
            student.running?.thresholdPace) && (
            <Card className="bg-g4-surface-alt">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-lime-deep">
                  Já cadastrado na ficha
                </span>
              </div>
              <p className="mt-2 text-sm text-g4-ink">
                {openAssessment.tipoTeste === "corrida" ? (
                  <>
                    {student.running?.hrMax != null && <>FC máxima: <strong>{student.running.hrMax} bpm</strong>. </>}
                    {student.running?.thresholdPace && <>Pace de limiar: <strong>{student.running.thresholdPace}/km</strong>.</>}
                  </>
                ) : (
                  <>
                    {student.cycling?.ftpWatts != null && <>FTP: <strong>{student.cycling.ftpWatts} W</strong>. </>}
                    {student.cycling?.hrMax != null && <>FC máxima: <strong>{student.cycling.hrMax} bpm</strong>.</>}
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-g4-muted">
                Referência da ficha do aluno, não uma estimativa — compare com o que a avaliação encontrar.
              </p>
            </Card>
          )}

          <Card>
            <CardTitle>Limiares (marcados pelo treinador)</CardTitle>
            <p className="mt-1 text-xs text-g4-muted">
              Olhe a curva abaixo e digite onde você identifica o LT1 (limiar aeróbico) e o LT2 (limiar
              anaeróbico) — não é calculado automaticamente nesta versão.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <label>
                <span className={labelClass}>LT1 — Potência (W)</span>
                <input
                  type="number"
                  value={openAssessment.lt1Potencia ?? ""}
                  onChange={(e) => updateOpenAssessment({ lt1Potencia: parseNumberOrNull(e.target.value) })}
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>LT1 — FC (bpm)</span>
                <input
                  type="number"
                  value={openAssessment.lt1Fc ?? ""}
                  onChange={(e) => updateOpenAssessment({ lt1Fc: parseNumberOrNull(e.target.value) })}
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>LT2 — Potência (W)</span>
                <input
                  type="number"
                  value={openAssessment.lt2Potencia ?? ""}
                  onChange={(e) => updateOpenAssessment({ lt2Potencia: parseNumberOrNull(e.target.value) })}
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>LT2 — FC (bpm)</span>
                <input
                  type="number"
                  value={openAssessment.lt2Fc ?? ""}
                  onChange={(e) => updateOpenAssessment({ lt2Fc: parseNumberOrNull(e.target.value) })}
                  className={fieldClass}
                />
              </label>
            </div>
          </Card>

          {chartData.length > 1 && (
            <Card>
              <CardTitle>Curva de lactato</CardTitle>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e5ea" vertical={false} />
                    <XAxis dataKey="x" tick={{ fontSize: 11, fill: "#68707b" }} label={{ value: "Potência (W) / tempo", position: "insideBottom", offset: -2, fontSize: 11, fill: "#68707b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#68707b" }} label={{ value: "mmol/L", angle: -90, position: "insideLeft", fontSize: 11, fill: "#68707b" }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="lactato" name="Lactato" stroke="#b91c1c" strokeWidth={2} dot />
                    {chartData.some((d) => d.glicemia != null) && (
                      <Line type="monotone" dataKey="glicemia" name="Glicemia" stroke="#4d7c0f" strokeWidth={2} dot />
                    )}
                    {openAssessment.lt1Potencia != null && (
                      <ReferenceLine x={openAssessment.lt1Potencia} stroke="#0ea5e9" strokeDasharray="4 4" label={{ value: "LT1", fontSize: 11, fill: "#0ea5e9" }} />
                    )}
                    {openAssessment.lt2Potencia != null && (
                      <ReferenceLine x={openAssessment.lt2Potencia} stroke="#b45309" strokeDasharray="4 4" label={{ value: "LT2", fontSize: 11, fill: "#b45309" }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card className="p-0">
            <div className="flex items-center justify-between gap-4 p-4 pb-0">
              <CardTitle>Estágios coletados</CardTitle>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={addStage}>
                + Adicionar estágio
              </Button>
            </div>

            {/* Celular: cards empilhados, um estágio por vez — a tabela larga
                (7 colunas + remover) só cabe rolando na horizontal, o que é
                ruim pra digitar valor de lactímetro/glicosímetro durante o
                teste. Mesmo padrão de dupla listagem do RosterTab.tsx. */}
            <div className="flex flex-col gap-4 p-4 sm:hidden">
              {openAssessment.stages.length === 0 && (
                <p className="text-center text-sm text-g4-muted">Nenhum estágio ainda — toque em &ldquo;+ Adicionar estágio&rdquo;.</p>
              )}
              {openAssessment.stages.map((stage, index) => (
                <div key={index} className="rounded-xl border border-g4-border p-3">
                  <div className="flex items-center justify-between border-b border-g4-border pb-2">
                    <span className="text-xs font-bold text-lime-deep">Estágio {stage.estagioNumero}</span>
                    <button
                      type="button"
                      onClick={() => removeStage(index)}
                      className="text-xs font-medium text-status-missed underline underline-offset-2 focus-ring"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <label>
                      <span className={labelClass}>Tempo (min)</span>
                      <input
                        type="number"
                        value={stage.tempoMinutos ?? ""}
                        onChange={(e) => updateStage(index, { tempoMinutos: parseNumberOrNull(e.target.value) })}
                        className={fieldClass}
                      />
                    </label>
                    {openAssessment.tipoTeste === "corrida" ? (
                      <label>
                        <span className={labelClass}>Pace</span>
                        <input
                          type="text"
                          placeholder="4:30/km"
                          value={stage.pace ?? ""}
                          onChange={(e) => updateStage(index, { pace: e.target.value || null })}
                          className={fieldClass}
                        />
                      </label>
                    ) : (
                      <label>
                        <span className={labelClass}>Potência (W)</span>
                        <input
                          type="number"
                          value={stage.potenciaWatts ?? ""}
                          onChange={(e) => updateStage(index, { potenciaWatts: parseNumberOrNull(e.target.value) })}
                          className={fieldClass}
                        />
                      </label>
                    )}
                    <label>
                      <span className={labelClass}>Lactato (mmol/L)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={stage.lactatoMmol ?? ""}
                        onChange={(e) => updateStage(index, { lactatoMmol: parseNumberOrNull(e.target.value) })}
                        className={fieldClass}
                      />
                    </label>
                    <label>
                      <span className={labelClass}>Glicemia</span>
                      <input
                        type="number"
                        value={stage.glicemia ?? ""}
                        onChange={(e) => updateStage(index, { glicemia: parseNumberOrNull(e.target.value) })}
                        className={fieldClass}
                      />
                    </label>
                    <label>
                      <span className={labelClass}>FC (bpm)</span>
                      <input
                        type="number"
                        value={stage.fcBpm ?? ""}
                        onChange={(e) => updateStage(index, { fcBpm: parseNumberOrNull(e.target.value) })}
                        className={fieldClass}
                      />
                    </label>
                    <label>
                      <span className={labelClass}>PSE</span>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={stage.pse ?? ""}
                        onChange={(e) => updateStage(index, { pse: parseNumberOrNull(e.target.value) })}
                        className={fieldClass}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/tablet: tabela completa, um estágio por linha. */}
            <div className="mt-3 hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-g4-surface-alt text-g4-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Estágio</th>
                  <th className="px-3 py-2 font-medium">Tempo (min)</th>
                  {openAssessment.tipoTeste === "corrida" ? (
                    <th className="px-3 py-2 font-medium">Pace</th>
                  ) : (
                    <th className="px-3 py-2 font-medium">Potência (W)</th>
                  )}
                  <th className="px-3 py-2 font-medium">Glicemia</th>
                  <th className="px-3 py-2 font-medium">FC (bpm)</th>
                  <th className="px-3 py-2 font-medium">Lactato (mmol/L)</th>
                  <th className="px-3 py-2 font-medium">PSE</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-g4-border">
                {openAssessment.stages.map((stage, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-g4-muted">{stage.estagioNumero}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={stage.tempoMinutos ?? ""}
                        onChange={(e) => updateStage(index, { tempoMinutos: parseNumberOrNull(e.target.value) })}
                        className={cn(fieldClass, "mt-0 w-20")}
                      />
                    </td>
                    {openAssessment.tipoTeste === "corrida" ? (
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="4:30/km"
                          value={stage.pace ?? ""}
                          onChange={(e) => updateStage(index, { pace: e.target.value || null })}
                          className={cn(fieldClass, "mt-0 w-24")}
                        />
                      </td>
                    ) : (
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={stage.potenciaWatts ?? ""}
                          onChange={(e) => updateStage(index, { potenciaWatts: parseNumberOrNull(e.target.value) })}
                          className={cn(fieldClass, "mt-0 w-20")}
                        />
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={stage.glicemia ?? ""}
                        onChange={(e) => updateStage(index, { glicemia: parseNumberOrNull(e.target.value) })}
                        className={cn(fieldClass, "mt-0 w-20")}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={stage.fcBpm ?? ""}
                        onChange={(e) => updateStage(index, { fcBpm: parseNumberOrNull(e.target.value) })}
                        className={cn(fieldClass, "mt-0 w-20")}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.1"
                        value={stage.lactatoMmol ?? ""}
                        onChange={(e) => updateStage(index, { lactatoMmol: parseNumberOrNull(e.target.value) })}
                        className={cn(fieldClass, "mt-0 w-20")}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={stage.pse ?? ""}
                        onChange={(e) => updateStage(index, { pse: parseNumberOrNull(e.target.value) })}
                        className={cn(fieldClass, "mt-0 w-16")}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeStage(index)}
                        className="text-xs text-status-missed underline underline-offset-2 focus-ring"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
                {openAssessment.stages.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-center text-g4-muted">
                      Nenhum estágio ainda — clique em &ldquo;+ Adicionar estágio&rdquo;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
            <div className="flex items-center justify-end gap-4 p-4">
              {saveError && <p className="text-sm text-status-missed">{saveError}</p>}
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar avaliação"}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
