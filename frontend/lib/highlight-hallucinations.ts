/** Heurísticas visuais para destacar trechos suspeitos (protótipo PLN — não substitui verificação humana). */

export type SuspiciousSpan = { start: number; end: number; reason: string };

const RULES: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /REsp\s*9\.999\.999\/[A-Z]{2}/gi,
    reason: "Numeração de REsp atípica — checar existência no STJ",
  },
  {
    pattern: /TEMA\s*REPETITIVO\s*12\.345\/STJ/gi,
    reason: "Identificador de tema repetitivo suspeito — conferir tabela oficial",
  },
  {
    pattern: /Súmula\s*999\/STJ/gi,
    reason: "Referência a súmula não verificada ou inexistente",
  },
  {
    pattern: /Súmula\s*999\/STJ\s*\(inexistente\)/gi,
    reason: "Menção explícita a súmula inexistente",
  },
  {
    pattern: /confissão\s+ficta\s+irrefragável/gi,
    reason: "Formulação jurídica incomum — possível invenção lexical",
  },
  {
    pattern: /julg(ar|amento)\s+antecipad[ao].{0,40}sem\s+instru(c|ç)ão/gi,
    reason: "Provimento atípico em recurso especial sem reexame fático",
  },
];

function mergeSpans(spans: SuspiciousSpan[]): SuspiciousSpan[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: SuspiciousSpan[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start <= last.end) {
      last.end = Math.max(last.end, s.end);
      if (!last.reason.includes(s.reason)) last.reason = `${last.reason}; ${s.reason}`;
      continue;
    }
    out.push({ ...s });
  }
  return out;
}

export function findSuspiciousSpans(text: string): SuspiciousSpan[] {
  if (!text) return [];
  const raw: SuspiciousSpan[] = [];
  for (const { pattern, reason } of RULES) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m: RegExpExecArray | null;
    const p = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
    while ((m = p.exec(text)) !== null) {
      raw.push({ start: m.index, end: m.index + m[0].length, reason });
    }
  }
  return mergeSpans(raw);
}

export function renderTextWithHighlights(
  text: string,
  spans: SuspiciousSpan[]
): { key: string; text: string; reason?: string }[] {
  if (!text) return [];
  if (spans.length === 0) return [{ key: "0", text }];
  const parts: { key: string; text: string; reason?: string }[] = [];
  let cursor = 0;
  spans.forEach((s, i) => {
    if (s.start > cursor) {
      parts.push({ key: `n${i}-${cursor}`, text: text.slice(cursor, s.start) });
    }
    parts.push({
      key: `h${i}`,
      text: text.slice(s.start, s.end),
      reason: s.reason,
    });
    cursor = s.end;
  });
  if (cursor < text.length) parts.push({ key: "end", text: text.slice(cursor) });
  return parts;
}
