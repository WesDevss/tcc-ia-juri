/** Matriz de confusão (conjunto de teste) para visualização na banca. */

export type ConfusionCounts = {
  vp: number;
  fp: number;
  fn: number;
  vn: number;
};

/** Valores plausíveis para apresentação quando não há NEXT_PUBLIC_CM_*. */
export const SIMULATED_CONFUSION: ConfusionCounts = {
  vp: 142,
  fp: 8,
  fn: 12,
  vn: 138,
};

function pickEnvInt(key: string): number | null {
  const v = process.env[key];
  if (v == null || v.trim() === "") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export function getConfusionForDisplay(isSimulation: boolean): ConfusionCounts & {
  caption: string;
} {
  const vp = pickEnvInt("NEXT_PUBLIC_CM_VP");
  const fp = pickEnvInt("NEXT_PUBLIC_CM_FP");
  const fn = pickEnvInt("NEXT_PUBLIC_CM_FN");
  const vn = pickEnvInt("NEXT_PUBLIC_CM_VN");
  if (vp !== null && fp !== null && fn !== null && vn !== null) {
    return {
      vp,
      fp,
      fn,
      vn,
      caption: "Contagens do conjunto de teste (métricas da monografia).",
    };
  }
  if (isSimulation) {
    return {
      ...SIMULATED_CONFUSION,
      caption:
        "Valores simulados para o modo demonstração, alinhados à ordem de grandeza de um experimento típico.",
    };
  }
    return {
      ...SIMULATED_CONFUSION,
      caption:
        "Valores de referência ilustrativos do experimento; configure NEXT_PUBLIC_CM_VP/FP/FN/VN após o relatório final.",
    };
}
