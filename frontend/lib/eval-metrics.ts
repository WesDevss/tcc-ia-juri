/** Métricas do conjunto de teste (offline), alinhadas ao capítulo metodológico do TCC. */

export type OfflineEvalMetrics = {
  accuracy: string;
  precision: string;
  recall: string;
  f1: string;
  /** true se todas as variáveis NEXT_PUBLIC_EVAL_* estiverem preenchidas no build */
  configured: boolean;
};

function fmt(v: string | undefined): string {
  if (v == null || v.trim() === "") return "—";
  const n = Number(String(v).trim().replace(",", "."));
  if (!Number.isFinite(n)) return v.trim();
  if (n >= 0 && n <= 1) return `${(n * 100).toFixed(1)}%`;
  return `${n.toFixed(1)}%`;
}

export function getOfflineEvalMetrics(): OfflineEvalMetrics {
  const a = process.env.NEXT_PUBLIC_EVAL_ACCURACY;
  const p = process.env.NEXT_PUBLIC_EVAL_PRECISION;
  const r = process.env.NEXT_PUBLIC_EVAL_RECALL;
  const f = process.env.NEXT_PUBLIC_EVAL_F1;
  const configured = [a, p, r, f].every((x) => x != null && String(x).trim() !== "");
  return {
    accuracy: fmt(a),
    precision: fmt(p),
    recall: fmt(r),
    f1: fmt(f),
    configured,
  };
}

/** Métricas exibidas no modal: no modo demonstração usam valores simulados credíveis. */
export const SIMULATED_EVAL: OfflineEvalMetrics = {
  accuracy: "87.4%",
  precision: "84.2%",
  recall: "91.0%",
  f1: "87.5%",
  configured: true,
};

export type ResolvedEvalMetrics = OfflineEvalMetrics & { isSimulated: boolean };

export function resolveEvalForDisplay(
  analysisMode: string | undefined,
  offline: OfflineEvalMetrics
): ResolvedEvalMetrics {
  if (analysisMode === "simulation") {
    return { ...SIMULATED_EVAL, isSimulated: true };
  }
  return { ...offline, isSimulated: false };
}
