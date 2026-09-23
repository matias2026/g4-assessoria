"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { detectThresholds } from "@/lib/lactate-threshold";
import { generatePhysiologyReportPdf } from "@/lib/physiology-pdf";
import type { MockStudent } from "@/lib/mock-data";
import {
  applyThresholdsToFicha,
  createPhysiologyAssessment,
  deletePhysiologyAssessment,
  generatePhysiologyReportDraft,
  getPhysiologyAssessment,
  listPhysiologyAssessments,
  parsePhysiologyFitFile,
  saveFinalPhysiologyReport,
  savePhysiologyAssessment,
  setPhysiologyAssessmentPublished,
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
 * estágios de um teste incremental, gráfico da curva, detecção automática
 * de LT1/LT2 (OBLA + Dmax modificado, ver src/lib/lactate-threshold.ts —
 * sempre uma sugestão, o campo manual é o que vale), HRV de repouso
 * digitado à mão (nenhuma fonte de sinal bruto pra calcular isso de
 * verdade), parecer técnico com rascunho por IA (revisado antes de
 * salvar), publicação controlada pro aluno ver na própria área, aplicar
 * limiar à ficha (sempre com confirmação explícita) e exportação em PDF.
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
  const [publishing, setPublishing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [savingReport, setSavingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [confirmingApplyFicha, setConfirmingApplyFicha] = useState(false);
  const [applyingFicha, setApplyingFicha] = useState(false);
  const [applyFichaError, setApplyFichaError] = useState<string | null>(null);
  const [importingFit, setImportingFit] = useState(false);
  const [importFitError, setImportFitError] = useState<string | null>(null);
  const fitInputRef = useRef<HTMLInputElement>(null);

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

  function resetEditorState() {
    setReportText("");
    setReportError(null);
    setConfirmingApplyFicha(false);
    setApplyFichaError(null);
  }

  async function handleOpen(assessmentId: string) {
    setOpenError(null);
    try {
      const detail = await getPhysiologyAssessment(assessmentId);
      setOpenAssessment(detail);
      resetEditorState();
      setReportText(detail.aiReportFinal ?? detail.aiReportDraft ?? "");
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
          {
            id: created.id,
            dataAvaliacao: created.dataAvaliacao,
            tipoTeste: created.tipoTeste,
            lt1Potencia: null,
            lt1Fc: null,
            lt2Potencia: null,
            lt2Fc: null,
            published: false,
          },
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

  // Importa estágios de um .FIT (potência/tempo/FC por volta/lap) — só
  // funciona se o aparelho gravou uma volta por degrau do teste. Lactato/
  // glicemia/PSE nunca vêm daqui, ficam pro treinador preencher depois.
  // Substitui os estágios atuais (confirma antes se já havia algum
  // preenchido, pra não perder lactato já digitado sem querer).
  async function handleImportFit(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !openAssessment) return;

    if (openAssessment.stages.length > 0) {
      const confirmed = window.confirm(
        "Isso substitui os estágios atuais pelos importados do .FIT (tempo/potência/FC). Lactato, glicemia e PSE já digitados nesses estágios serão perdidos. Continuar?"
      );
      if (!confirmed) return;
    }

    setImportFitError(null);
    setImportingFit(true);
    try {
      const laps = await parsePhysiologyFitFile(file);
      if (laps.length === 0) {
        setImportFitError(
          "Nenhuma volta (lap) encontrada nesse arquivo — grave marcando lap a cada estágio do teste, ou adicione os estágios manualmente."
        );
        return;
      }
      setOpenAssessment((prev) =>
        prev
          ? {
              ...prev,
              stages: laps.map((lap, i) => ({
                id: null,
                estagioNumero: i + 1,
                tempoMinutos: lap.tempoMinutos,
                potenciaWatts: lap.potenciaWatts,
                pace: null,
                glicemia: null,
                fcBpm: lap.fcBpm,
                lactatoMmol: null,
                pse: null,
              })),
            }
          : prev
      );
    } catch (err) {
      setImportFitError(err instanceof Error ? err.message : "Não foi possível ler esse arquivo .FIT.");
    } finally {
      setImportingFit(false);
    }
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
        hrvRmssdRest: openAssessment.hrvRmssdRest,
        hrvSdnnRest: openAssessment.hrvSdnnRest,
        hrvNotes: openAssessment.hrvNotes,
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
                published: a.published,
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

  // Publicar/despublicar pro aluno — a avaliação só fica visível na área
  // dele quando `published = true` (ver migração 0027). Nunca automático:
  // é sempre um clique deliberado do treinador.
  async function handlePublishToggle() {
    if (!openAssessment) return;
    setPublishing(true);
    try {
      const nextPublished = !openAssessment.published;
      await setPhysiologyAssessmentPublished(openAssessment.id, nextPublished);
      updateOpenAssessment({ published: nextPublished });
      if (studentId) {
        setAssessmentsByStudent((prev) => ({
          ...prev,
          [studentId]: (prev[studentId] ?? []).map((a) => (a.id === openAssessment.id ? { ...a, published: nextPublished } : a)),
        }));
      }
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : "Não foi possível atualizar a publicação.");
    } finally {
      setPublishing(false);
    }
  }

  // Gera o rascunho com Gemini — sempre editável antes de salvar como
  // parecer final (nunca vai pro aluno sem o treinador revisar).
  async function handleGenerateReport() {
    if (!openAssessment) return;
    setGeneratingReport(true);
    setReportError(null);
    try {
      const draft = await generatePhysiologyReportDraft(openAssessment.id);
      setReportText(draft);
      updateOpenAssessment({ aiReportDraft: draft });
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Não foi possível gerar o rascunho agora.");
    } finally {
      setGeneratingReport(false);
    }
  }

  async function handleSaveReport() {
    if (!openAssessment) return;
    setSavingReport(true);
    setReportError(null);
    try {
      await saveFinalPhysiologyReport(openAssessment.id, reportText);
      updateOpenAssessment({ aiReportFinal: reportText });
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Não foi possível salvar o parecer.");
    } finally {
      setSavingReport(false);
    }
  }

  // Grava o(s) limiar(es) marcados na ficha do aluno — só depois de o
  // treinador confirmar explicitamente o que vai mudar (ver
  // confirmingApplyFicha/renderApplyFichaSummary abaixo).
  async function handleApplyToFicha() {
    if (!openAssessment) return;
    setApplyingFicha(true);
    setApplyFichaError(null);
    try {
      await applyThresholdsToFicha(openAssessment.id, {
        ftpWatts: openAssessment.tipoTeste === "ciclismo" ? openAssessment.lt2Potencia : null,
        thresholdPace: null,
        hrThreshold: openAssessment.lt2Fc,
      });
      updateOpenAssessment({ appliedToFichaAt: new Date().toISOString() });
      setConfirmingApplyFicha(false);
    } catch (e) {
      setApplyFichaError(e instanceof Error ? e.message : "Não foi possível atualizar a ficha do aluno.");
    } finally {
      setApplyingFicha(false);
    }
  }

  function handleGeneratePdf() {
    if (!openAssessment || !student) return;
    generatePhysiologyReportPdf(student.name, openAssessment);
  }

  if (!student) {
    return <p className="text-sm text-g4-muted">Cadastre um aluno para liberar a aba de fisiologia.</p>;
  }

  const chartData = openAssessment
    ? openAssessment.stages
        .filter((s) => s.lactatoMmol != null)
        .map((s) => ({ x: s.potenciaWatts ?? s.tempoMinutos ?? s.estagioNumero, lactato: s.lactatoMmol, glicemia: s.glicemia }))
    : [];

  // Detecção automática (OBLA 2.0/4.0 mmol/L + Dmax modificado, ver
  // src/lib/lactate-threshold.ts) — só funciona pra teste por potência
  // (ciclismo); é sempre uma sugestão, nunca sobrescreve o campo manual
  // sozinha, o treinador clica em "Usar" se concordar.
  const detected =
    openAssessment && openAssessment.tipoTeste !== "corrida"
      ? detectThresholds(openAssessment.stages.map((s) => ({ intensity: s.potenciaWatts, lactate: s.lactatoMmol, fc: s.fcBpm })))
      : { lt1Intensity: null, lt1Fc: null, lt2Intensity: null, lt2Fc: null };

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
                      <Badge tone="neutral">{TIPO_TESTE_LABEL[a.tipoTeste]}</Badge>{" "}
                      <Badge tone={a.published ? "lime" : "neutral"}>{a.published ? "Publicada" : "Rascunho"}</Badge>
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
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  className="text-xs font-semibold text-lime-deep underline underline-offset-2 focus-ring"
                >
                  Gerar PDF do relatório
                </button>
                <button
                  type="button"
                  onClick={() => setOpenAssessment(null)}
                  className="text-xs font-semibold text-g4-muted underline underline-offset-2 focus-ring"
                >
                  ← Voltar
                </button>
              </div>
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
            <CardTitle>Limiares</CardTitle>
            <p className="mt-1 text-xs text-g4-muted">
              {openAssessment.tipoTeste === "corrida"
                ? "Teste por pace não tem detecção automática nesta versão — marque olhando a curva."
                : "Sugestão automática (OBLA 2.0/4.0 mmol/L + Dmax modificado) ao lado — clique em \"Usar\" se concordar, ou digite o seu."}
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
                {detected.lt1Intensity != null && (
                  <button
                    type="button"
                    onClick={() => updateOpenAssessment({ lt1Potencia: detected.lt1Intensity, lt1Fc: detected.lt1Fc })}
                    className="mt-1 text-xs text-lime-deep underline underline-offset-2 focus-ring"
                  >
                    Sugestão: {detected.lt1Intensity} W{detected.lt1Fc != null ? ` (${detected.lt1Fc} bpm)` : ""} — usar
                  </button>
                )}
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
                {detected.lt2Intensity != null && (
                  <button
                    type="button"
                    onClick={() => updateOpenAssessment({ lt2Potencia: detected.lt2Intensity, lt2Fc: detected.lt2Fc })}
                    className="mt-1 text-xs text-lime-deep underline underline-offset-2 focus-ring"
                  >
                    Sugestão: {detected.lt2Intensity} W{detected.lt2Fc != null ? ` (${detected.lt2Fc} bpm)` : ""} — usar
                  </button>
                )}
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

          <Card>
            <CardTitle>HRV de repouso (opcional)</CardTitle>
            <p className="mt-1 text-xs text-g4-muted">
              Digitado de um app/dispositivo externo (Kubios, Elite HRV etc.) — o app não mede HRV
              diretamente, não calcula nada aqui.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <label>
                <span className={labelClass}>RMSSD (ms)</span>
                <input
                  type="number"
                  value={openAssessment.hrvRmssdRest ?? ""}
                  onChange={(e) => updateOpenAssessment({ hrvRmssdRest: parseNumberOrNull(e.target.value) })}
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>SDNN (ms)</span>
                <input
                  type="number"
                  value={openAssessment.hrvSdnnRest ?? ""}
                  onChange={(e) => updateOpenAssessment({ hrvSdnnRest: parseNumberOrNull(e.target.value) })}
                  className={fieldClass}
                />
              </label>
            </div>
            <label className="mt-3 block">
              <span className={labelClass}>Notas de HRV</span>
              <textarea
                rows={2}
                value={openAssessment.hrvNotes}
                onChange={(e) => updateOpenAssessment({ hrvNotes: e.target.value })}
                className={fieldClass}
              />
            </label>
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

          <Card>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Parecer técnico (rascunho por IA)</CardTitle>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={handleGenerateReport} disabled={generatingReport}>
                {generatingReport ? "Gerando..." : "Gerar rascunho com IA"}
              </Button>
            </div>
            <p className="mt-1 text-xs text-g4-muted">
              Rascunho editável — o aluno só vê a versão que você salvar aqui, e só depois de publicar a
              avaliação (abaixo).
            </p>
            <textarea
              rows={5}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Gere um rascunho com IA ou escreva o parecer você mesmo."
              className={cn(fieldClass, "mt-3")}
            />
            <div className="mt-3 flex items-center justify-end gap-4">
              {reportError && <p className="text-sm text-status-missed">{reportError}</p>}
              <Button variant="primary" className="px-3 py-1.5 text-xs" onClick={handleSaveReport} disabled={savingReport || !reportText.trim()}>
                {savingReport ? "Salvando..." : "Salvar parecer"}
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Publicar pro aluno</CardTitle>
                <p className="mt-1 text-xs text-g4-muted">
                  {openAssessment.published
                    ? "O aluno já vê esta avaliação (estágios, gráfico e parecer salvo) em \"Meu perfil\"."
                    : "O aluno ainda não vê esta avaliação — é um rascunho seu."}
                </p>
              </div>
              <Button variant={openAssessment.published ? "secondary" : "primary"} onClick={handlePublishToggle} disabled={publishing}>
                {publishing ? "Atualizando..." : openAssessment.published ? "Despublicar" : "Publicar pro aluno"}
              </Button>
            </div>
          </Card>

          {(openAssessment.lt2Potencia != null || openAssessment.lt2Fc != null) && (
            <Card>
              <CardTitle>Aplicar à ficha do aluno</CardTitle>
              {openAssessment.appliedToFichaAt && (
                <p className="mt-1 text-xs text-g4-muted">
                  Última vez aplicado em {new Date(openAssessment.appliedToFichaAt).toLocaleString("pt-BR")}.
                </p>
              )}
              {!confirmingApplyFicha ? (
                <Button variant="secondary" className="mt-3 px-3 py-1.5 text-xs" onClick={() => setConfirmingApplyFicha(true)}>
                  Aplicar limiares à ficha
                </Button>
              ) : (
                <div className="mt-3 rounded-xl border border-g4-border bg-g4-surface-alt p-3">
                  <p className="text-sm text-g4-ink">Isso vai atualizar na ficha do aluno:</p>
                  <ul className="mt-2 flex flex-col gap-4 text-sm text-g4-ink">
                    {openAssessment.tipoTeste === "ciclismo" && openAssessment.lt2Potencia != null && (
                      <li>
                        FTP: <span className="text-g4-muted">{student.cycling?.ftpWatts ?? "—"} W</span> →{" "}
                        <strong>{openAssessment.lt2Potencia} W</strong>
                      </li>
                    )}
                    {openAssessment.lt2Fc != null && (
                      <li>
                        FC de limiar: <span className="text-g4-muted">
                          {(openAssessment.tipoTeste === "corrida" ? student.running?.hrThreshold : student.cycling?.hrThreshold) ?? "—"} bpm
                        </span>{" "}
                        → <strong>{openAssessment.lt2Fc} bpm</strong>
                      </li>
                    )}
                  </ul>
                  {applyFichaError && <p className="mt-2 text-sm text-status-missed">{applyFichaError}</p>}
                  <div className="mt-3 flex items-center gap-4">
                    <Button variant="primary" className="px-3 py-1.5 text-xs" onClick={handleApplyToFicha} disabled={applyingFicha}>
                      {applyingFicha ? "Aplicando..." : "Confirmar"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setConfirmingApplyFicha(false)}
                      className="text-xs text-g4-muted underline underline-offset-2 focus-ring"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card className="p-0">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 pb-0">
              <CardTitle>Estágios coletados</CardTitle>
              <div className="flex items-center gap-4">
                <input ref={fitInputRef} type="file" accept=".fit,application/octet-stream" className="hidden" onChange={handleImportFit} />
                <Button
                  variant="secondary"
                  className="px-3 py-1.5 text-xs"
                  onClick={() => fitInputRef.current?.click()}
                  disabled={importingFit}
                >
                  {importingFit ? "Importando..." : "Importar .FIT"}
                </Button>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={addStage}>
                  + Adicionar estágio
                </Button>
              </div>
            </div>
            {importFitError && <p className="px-4 text-sm text-status-missed">{importFitError}</p>}
            <p className="px-4 text-xs text-g4-muted">
              Importar preenche tempo/potência/FC de cada volta (lap) do arquivo — lactato, glicemia e PSE
              continuam sendo digitados à mão, nenhum sensor de ciclocomputador grava isso.
            </p>

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
