/** Normaliza vetor para norma L2 (evita divisão por zero). */
export function l2Normalize(v: number[]): number[] {
  let s = 0;
  for (const x of v) s += x * x;
  const n = Math.sqrt(s) || 1;
  return v.map((x) => x / n);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  const na = l2Normalize(a);
  const nb = l2Normalize(b);
  let d = 0;
  for (let i = 0; i < na.length; i++) d += na[i] * nb[i];
  return d;
}

/**
 * Converte resposta bruta da Inference API (feature-extraction) em um único vetor.
 * Aceita: vetor 1D, matriz [tokens][dim] (média dos tokens), ou primeiro elemento de batch.
 */
export function rawToEmbeddingVector(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Resposta de embedding vazia ou inválida.");
  }

  const first = raw[0];
  if (typeof first === "number") {
    return raw as number[];
  }

  if (Array.isArray(first)) {
    const rows = raw as number[][];
    if (rows.length === 0) throw new Error("Matriz de embedding vazia.");
    if (typeof rows[0][0] === "number") {
      const dim = rows[0].length;
      const acc = new Array(dim).fill(0);
      for (const row of rows) {
        for (let i = 0; i < dim; i++) acc[i] += row[i] ?? 0;
      }
      for (let i = 0; i < dim; i++) acc[i] /= rows.length;
      return acc;
    }

    // Batch: [[tokens][dim]] — usa primeiro item do batch
    return rawToEmbeddingVector(first as unknown[]);
  }

  throw new Error("Formato de embedding não reconhecido.");
}

/** Similaridade 0–100 para barra de progresso (cosseno tipicamente entre -1 e 1). */
export function cosineToPercent(sim: number): number {
  const clamped = Math.max(-1, Math.min(1, sim));
  return Math.round(((clamped + 1) / 2) * 100);
}
