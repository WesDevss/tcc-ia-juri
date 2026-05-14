import { jsPDF } from "jspdf";
import type { AnalyzeResponse } from "./analyze-types";

export type ReportMetrics = {
  accuracy: string;
  precision: string;
  recall: string;
  f1: string;
  isSimulated: boolean;
};

/** Relatório simples em PDF (texto) para auditoria acadêmica. */
export function downloadIntegrityPdf(opts: {
  analyzedText: string;
  result: AnalyzeResponse;
  metrics: ReportMetrics;
  corpusUpdated: string;
  confusionCaption: string;
  vp: number;
  fp: number;
  fn: number;
  vn: number;
}): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const lineH = 6;
  let y = 16;
  const left = 14;
  const maxW = 182;

  const addPara = (text: string, size = 10) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = 16;
      }
      doc.text(line, left, y);
      y += lineH;
    }
    y += 2;
  };

  doc.setFontSize(15);
  doc.text("Relatorio de integridade (JurisCheck — projeto academico)", left, y);
  y += 10;

  doc.setFontSize(9);
  doc.setTextColor(80);
  addPara(
    "Documento gerado para fins de apoio a leitura critica. Nao substitui pesquisa no STJ nem parecer profissional."
  );
  doc.setTextColor(0);

  addPara(`Data de referencia da amostra (ementas STJ): ${opts.corpusUpdated}`, 10);
  addPara(
    "Conformidade: Resolucao n. 615/2025 do CNJ (uso responsavel de IA no Poder Judiciario).",
    10
  );

  doc.setFontSize(11);
  doc.text("1. Texto analisado", left, y);
  y += 8;
  addPara(opts.analyzedText.slice(0, 12000) || "(vazio)");

  doc.setFontSize(11);
  if (y > 250) {
    doc.addPage();
    y = 16;
  }
  doc.text("2. Indicadores desta sessao", left, y);
  y += 8;
  addPara(
    `Indice de confianca (combinado na interface): ${opts.result.veracityPercent}%. Aderencia semantica a amostra de referencia: ${opts.result.similarityPercent}%.`
  );
  if (opts.result.legalAlert) {
    addPara("Alerta: verificacao recomendada (baixa aderencia ou inconsistencia indicada).");
  }

  doc.setFontSize(11);
  if (y > 250) {
    doc.addPage();
    y = 16;
  }
  doc.text("3. Metricas do classificador (conjunto de teste)", left, y);
  y += 8;
  addPara(
    opts.metrics.isSimulated
      ? "Valores simulados ou ilustrativos conforme modo de demonstracao ou ausencia de variaveis NEXT_PUBLIC_EVAL_*."
      : "Valores provenientes das variaveis de ambiente (treinamento/avaliacao offline)."
  );
  addPara(
    `Acuracia: ${opts.metrics.accuracy} | Precisao: ${opts.metrics.precision} | Revocacao: ${opts.metrics.recall} | F1: ${opts.metrics.f1}`
  );

  doc.setFontSize(11);
  if (y > 250) {
    doc.addPage();
    y = 16;
  }
  doc.text("4. Matriz de confusao (referencia)", left, y);
  y += 8;
  addPara(opts.confusionCaption);
  addPara(
    `VP: ${opts.vp} | FP: ${opts.fp} | FN: ${opts.fn} | VN: ${opts.vn} (FP: falso positivo — modelo aceita trecho falso como real; FN: falso negativo.)`
  );

  doc.save(`relatorio-integridade-${new Date().toISOString().slice(0, 10)}.pdf`);
}
