import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PhysiologyAssessmentDetail } from "@/app/(coach)/cockpit/physiology-actions";

const TIPO_TESTE_LABEL: Record<string, string> = { ciclismo: "Ciclismo", corrida: "Corrida", outro: "Outro" };

// Gera o PDF inteiro no navegador (jsPDF), sem round-trip pro servidor —
// mesmo espírito de src/lib/workout-export.ts (.FIT/.ZWO), não precisa de
// nenhuma infra de renderização server-side (Puppeteer etc.) só pra um
// relatório de texto + tabela.
export function generatePhysiologyReportPdf(athleteName: string, assessment: PhysiologyAssessmentDetail): void {
  const doc = new jsPDF();
  const dateLabel = new Date(`${assessment.dataAvaliacao}T00:00:00`).toLocaleDateString("pt-BR");

  doc.setFontSize(16);
  doc.text("Avaliação de Limiar de Lactato", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`${athleteName} · ${TIPO_TESTE_LABEL[assessment.tipoTeste] ?? assessment.tipoTeste} · ${dateLabel}`, 14, 25);
  doc.setTextColor(0);

  let y = 34;
  doc.setFontSize(11);
  doc.text(
    `LT1 (aeróbico): ${assessment.lt1Potencia != null ? `${assessment.lt1Potencia} W` : "—"}${assessment.lt1Fc != null ? ` · ${assessment.lt1Fc} bpm` : ""}`,
    14,
    y
  );
  y += 6;
  doc.text(
    `LT2 (anaeróbico): ${assessment.lt2Potencia != null ? `${assessment.lt2Potencia} W` : "—"}${assessment.lt2Fc != null ? ` · ${assessment.lt2Fc} bpm` : ""}`,
    14,
    y
  );
  y += 6;
  if (assessment.hrvRmssdRest != null) {
    doc.text(`HRV de repouso (RMSSD): ${assessment.hrvRmssdRest} ms`, 14, y);
    y += 6;
  }

  autoTable(doc, {
    startY: y + 4,
    head: [["Estágio", "Tempo (min)", assessment.tipoTeste === "corrida" ? "Pace" : "Potência (W)", "Glicemia", "FC (bpm)", "Lactato (mmol/L)", "PSE"]],
    body: assessment.stages.map((s) => [
      String(s.estagioNumero),
      s.tempoMinutos != null ? String(s.tempoMinutos) : "—",
      assessment.tipoTeste === "corrida" ? (s.pace ?? "—") : s.potenciaWatts != null ? String(s.potenciaWatts) : "—",
      s.glicemia != null ? String(s.glicemia) : "—",
      s.fcBpm != null ? String(s.fcBpm) : "—",
      s.lactatoMmol != null ? String(s.lactatoMmol) : "—",
      s.pse != null ? String(s.pse) : "—",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [77, 124, 15] },
  });

  const afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  const report = assessment.aiReportFinal ?? assessment.aiReportDraft;
  if (report) {
    doc.setFontSize(12);
    doc.text("Parecer técnico", 14, afterTableY);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(report, 180);
    doc.text(lines, 14, afterTableY + 7);
  }

  if (assessment.observacoes) {
    const obsY = report ? afterTableY + 7 + doc.splitTextToSize(report, 180).length * 5 + 8 : afterTableY;
    doc.setFontSize(12);
    doc.text("Observações", 14, obsY);
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(assessment.observacoes, 180), 14, obsY + 7);
  }

  doc.save(`avaliacao-lactato-${athleteName.replace(/\s+/g, "-").toLowerCase()}-${assessment.dataAvaliacao}.pdf`);
}
