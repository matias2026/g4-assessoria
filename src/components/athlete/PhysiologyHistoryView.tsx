"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  getOwnPhysiologyAssessment,
  type OwnPhysiologyAssessmentDetail,
  type OwnPhysiologyAssessmentSummary,
} from "@/app/(athlete)/dashboard/physiology-actions";

const TIPO_TESTE_LABEL: Record<string, string> = { ciclismo: "Ciclismo", corrida: "Corrida", outro: "Outro" };

interface PhysiologyHistoryViewProps {
  assessments: OwnPhysiologyAssessmentSummary[];
}

/**
 * Lista + detalhe das avaliações fisiológicas publicadas pelo treinador —
 * só leitura, mesmo card visual do Cockpit (ver PhysiologyTab.tsx) sem os
 * campos de edição. Nunca mostra o rascunho de IA nem as observações
 * internas do treinador (ver physiology-actions.ts do lado do aluno).
 */
export function PhysiologyHistoryView({ assessments }: PhysiologyHistoryViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OwnPhysiologyAssessmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen(id: string) {
    setOpenId(id);
    setDetail(null);
    setError(null);
    setLoading(true);
    try {
      const value = await getOwnPhysiologyAssessment(id);
      setDetail(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível abrir a avaliação.");
    } finally {
      setLoading(false);
    }
  }

  const chartData = detail
    ? detail.stages
        .filter((s) => s.lactatoMmol != null)
        .map((s) => ({ x: s.potenciaWatts ?? s.tempoMinutos ?? s.estagioNumero, lactato: s.lactatoMmol }))
    : [];

  return (
    <div className="flex flex-col gap-4">
      {assessments.map((a) => (
        <Card key={a.id} className="p-0">
          <button type="button" onClick={() => handleOpen(a.id)} className="flex w-full items-center justify-between p-4 text-left">
            <div>
              <p className="text-sm font-medium text-g4-ink">
                {new Date(`${a.dataAvaliacao}T00:00:00`).toLocaleDateString("pt-BR")} ·{" "}
                <Badge tone="neutral">{TIPO_TESTE_LABEL[a.tipoTeste] ?? a.tipoTeste}</Badge>
              </p>
              <p className="mt-1 text-xs text-g4-muted">
                {a.lt2Potencia != null ? `LT2: ${a.lt2Potencia} W` : "Sem limiar marcado"}
                {a.lt2Fc != null ? ` · ${a.lt2Fc} bpm` : ""}
              </p>
            </div>
            <span className="text-xs text-lime-deep underline underline-offset-2">{openId === a.id ? "Fechar" : "Ver"}</span>
          </button>

          {openId === a.id && (
            <div className="border-t border-g4-border p-4">
              {loading && <p className="text-sm text-g4-muted">Carregando...</p>}
              {error && <p className="text-sm text-status-missed">{error}</p>}
              {detail && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p className="text-g4-muted">
                      LT1 <span className="block text-g4-ink">{detail.lt1Potencia != null ? `${detail.lt1Potencia} W` : "—"}{detail.lt1Fc != null ? ` · ${detail.lt1Fc} bpm` : ""}</span>
                    </p>
                    <p className="text-g4-muted">
                      LT2 <span className="block text-g4-ink">{detail.lt2Potencia != null ? `${detail.lt2Potencia} W` : "—"}{detail.lt2Fc != null ? ` · ${detail.lt2Fc} bpm` : ""}</span>
                    </p>
                  </div>

                  {chartData.length > 1 && (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                          <CartesianGrid stroke="#e2e5ea" vertical={false} />
                          <XAxis dataKey="x" tick={{ fontSize: 11, fill: "#68707b" }} />
                          <YAxis tick={{ fontSize: 11, fill: "#68707b" }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="lactato" name="Lactato" stroke="#b91c1c" strokeWidth={2} dot />
                          {detail.lt1Potencia != null && (
                            <ReferenceLine x={detail.lt1Potencia} stroke="#0ea5e9" strokeDasharray="4 4" />
                          )}
                          {detail.lt2Potencia != null && (
                            <ReferenceLine x={detail.lt2Potencia} stroke="#b45309" strokeDasharray="4 4" />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {detail.parecer && (
                    <div>
                      <CardTitle>Parecer do treinador</CardTitle>
                      <p className="mt-1 whitespace-pre-line text-sm text-g4-ink">{detail.parecer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
