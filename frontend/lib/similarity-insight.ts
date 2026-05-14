/** Extrai um trecho curto após "EMENTA:" para contextualizar o feedback ao usuário. */
export function extractAssuntoHint(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const upper = trimmed.slice(0, 20).toUpperCase();
  if (!upper.includes("EMENTA")) return null;

  const match = trimmed.match(/EMENTA\s*:\s*(.+)/i);
  if (!match?.[1]) return null;
  const firstLine = match[1].split(/\n/)[0]?.trim() ?? "";
  const beforeDot = firstLine.split(/[.;]/)[0]?.trim() ?? firstLine;
  if (!beforeDot) return null;
  const short = beforeDot.length > 100 ? `${beforeDot.slice(0, 97)}…` : beforeDot;
  return short;
}

/** Texto educativo curto sobre similaridade semântica (RAG / embeddings), sem jargão de infra. */
export function buildSimilarityInsight(
  userText: string,
  similarityPercent: number
): string {
  const hint = extractAssuntoHint(userText);
  const band =
    similarityPercent >= 62
      ? "há relativa proximidade de sentido"
      : similarityPercent >= 45
        ? "há proximidade moderada de sentido"
        : "a estrutura e o sentido tendem a divergir";

  const thematic = hint
    ? `No trecho informado, a ênfase inicial remete a “${hint}”. Nesse contexto, `
    : "Em termos de conteúdo jurídico, ";

  return `${thematic}${band} entre o texto analisado e o estilo das ementas reais da amostra de referência do STJ. O indicador usa similaridade semântica (representação vetorial do significado), e não uma busca literal por palavras-chave.`;
}
