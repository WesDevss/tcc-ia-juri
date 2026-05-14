"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalyzeResponse } from "@/lib/analyze-types";
import { EXAMPLE_HALLUCINATION_TEXT } from "@/lib/demo-text";
import { getOfflineEvalMetrics, resolveEvalForDisplay } from "@/lib/eval-metrics";
import { buildSimilarityInsight } from "@/lib/similarity-insight";
import { findSuspiciousSpans, renderTextWithHighlights } from "@/lib/highlight-hallucinations";
import { getConfusionForDisplay } from "@/lib/confusion-matrix";

function IconInfo(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 10v6M12 8h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconScale(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLink(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M10 13a5 5 0 007.07.07l1-1a5 5 0 00-7.07-7.07l-1.41 1.41M14 11a5 5 0 00-7.07-.07l-1 1a5 5 0 007.07 7.07l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconShield(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HighlightedPreview({ text }: { text: string }) {
  const spans = useMemo(() => findSuspiciousSpans(text), [text]);
  const parts = useMemo(() => renderTextWithHighlights(text, spans), [text, spans]);
  return (
    <div className="max-h-[min(70vh,28rem)] min-h-[200px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/90 p-4 text-left text-[15px] leading-relaxed text-slate-900 break-words whitespace-pre-wrap">
      {parts.length === 0 ? (
        <span className="text-slate-400">(sem texto)</span>
      ) : (
        parts.map((p, idx) =>
          p.reason ? (
            <mark
              key={`${p.key}-${idx}`}
              title={p.reason}
              className="cursor-help rounded-sm bg-red-100 px-0.5 font-medium text-red-950 underline decoration-red-400 decoration-2 underline-offset-2"
            >
              {p.text}
            </mark>
          ) : (
            <span key={`${p.key}-${idx}`}>{p.text}</span>
          )
        )
      )}
    </div>
  );
}

function RagFlowStrip() {
  const steps = [
    { n: "1", t: "Entrada do usuário" },
    { n: "2", t: "Representação semântica do texto" },
    { n: "3", t: "Comparação com amostra real do STJ" },
    { n: "4", t: "Índices e veredito supervisionado" },
  ];
  return (
    <div
      className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-3"
      role="img"
      aria-label="Fluxo de análise ancorada em evidências"
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Caminho da confiança (RAG conceitual)
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-2">
        {steps.map((s, i) => (
          <span key={s.n} className="flex items-center gap-1 text-xs text-slate-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-jud-accent/15 text-[11px] font-bold text-jud-accent">
              {s.n}
            </span>
            <span className="font-medium">{s.t}</span>
            {i < steps.length - 1 && (
              <span className="hidden px-1 text-slate-300 sm:inline" aria-hidden>
                →
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function ConfusionMatrixVisual({
  vp,
  fp,
  fn,
  vn,
}: {
  vp: number;
  fp: number;
  fn: number;
  vn: number;
}) {
  const cell = (
    label: string,
    sub: string,
    value: number,
    ring: string,
    bg: string
  ) => (
    <div
      title={sub}
      className={`rounded-xl border-2 p-3 text-center shadow-sm transition hover:brightness-95 ${ring} ${bg}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-[10px] leading-tight text-slate-600">{sub}</p>
    </div>
  );
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold text-slate-700">Matriz de confusão (conjunto de teste)</p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
        Passe o cursor sobre cada célula. <strong>Falsos positivos</strong> (FP) indicam que o modelo
        acreditou em trecho falso — especialmente sensível no Direito.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {cell(
          "VP",
          "Acertou como real",
          vp,
          "border-emerald-300",
          "bg-emerald-50/90"
        )}
        {cell(
          "FP",
          "Chamou falso de real",
          fp,
          "border-rose-400",
          "bg-rose-50/90"
        )}
        {cell(
          "FN",
          "Chamou real de falso",
          fn,
          "border-amber-300",
          "bg-amber-50/90"
        )}
        {cell(
          "VN",
          "Acertou como falso",
          vn,
          "border-slate-300",
          "bg-slate-50/90"
        )}
      </div>
      <p className="mt-3 text-[10px] text-slate-500">
        Eixo implícito: classe prevista × classe real (binário real / não real no corpus do TCC).
      </p>
    </div>
  );
}

function IconLoader(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${props.className}`} aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path
        d="M12 2a10 10 0 019.8 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function HomePage() {
  const [text, setText] = useState("");
  const [simulation, setSimulation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [metadataOpen, setMetadataOpen] = useState(false);

  const offlineMetrics = useMemo(() => getOfflineEvalMetrics(), []);

  const displayedEval = useMemo(
    () => (result ? resolveEvalForDisplay(result.mode, offlineMetrics) : null),
    [result, offlineMetrics]
  );

  const confusionDisplay = useMemo(
    () => (result ? getConfusionForDisplay(result.mode === "simulation") : null),
    [result]
  );

  const similarityInsight = useMemo(() => {
    if (!result || !text.trim()) return "";
    return buildSimilarityInsight(text, result.similarityPercent);
  }, [result, text]);

  const corpusUpdated =
    process.env.NEXT_PUBLIC_REFERENCE_CORPUS_UPDATED_AT ?? "maio de 2026";

  useEffect(() => {
    if (!metadataOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMetadataOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [metadataOpen]);

  async function runAnalyze() {
    setClientError(null);
    setMetadataOpen(false);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, simulation }),
      });
      const data = (await res.json()) as AnalyzeResponse & { error?: string };
      if (!res.ok) {
        setClientError(data.error ?? "Não foi possível concluir a análise.");
        return;
      }
      setResult(data);
    } catch {
      setClientError("Conexão indisponível. Verifique sua rede e tente outra vez.");
    } finally {
      setLoading(false);
    }
  }

  function fillHallucinationExample() {
    setText(EXAMPLE_HALLUCINATION_TEXT);
    setSimulation(false);
  }

  const verdictLabel =
    result?.classification?.verdict === "real"
      ? "O texto se alinha a padrões típicos de jurisprudência autêntica."
      : result?.classification?.verdict === "alucinada"
        ? "Há forte indício de inconsistência ou fabricação em relação à prática usual do STJ."
        : result?.classification
          ? "O sistema não atribuiu uma classe clara; use cautela e confirme na fonte oficial."
          : "Indicador calculado pela proximidade linguística com uma amostra curada de referência do STJ.";

  const analysisOrigin =
    result?.classification?.source === "hf_classifier"
      ? "Modelo supervisionado"
      : result?.mode === "simulation"
        ? "Demonstração acadêmica"
        : "Somente proximidade textual";

  return (
    <>
    <div className="bg-app-grid min-h-screen overflow-x-hidden">
      <main className="mx-auto max-w-6xl min-w-0 px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-12">
        <header className="mb-10 text-center lg:mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Projeto acadêmico
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.35rem]">
            Confiabilidade de jurisprudência
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
            Compare ementas e trechos decisórios com padrões extraídos de decisões reais do STJ.
            Indicadores ajudam a identificar possíveis distorções ou trechos que merecem checagem
            manual antes de uso profissional.
          </p>
        </header>

        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <section className="min-w-0 lg:col-span-5">
            <div className="sticky top-8 max-w-full overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-7 shadow-card-lg backdrop-blur-sm sm:p-9 lg:p-10">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Entrada
              </h2>
              <p className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">Texto para análise</p>

              <div className="mt-8 flex min-w-0 flex-col gap-3">
                <div className="flex w-full min-w-0 items-start gap-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 px-5 py-4">
                  <input
                    type="checkbox"
                    id="modo-demo"
                    checked={simulation}
                    onChange={(e) => setSimulation(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-jud-accent focus:ring-2 focus:ring-jud-accent/30"
                  />
                  <label htmlFor="modo-demo" className="min-w-0 flex-1 cursor-pointer text-sm leading-snug">
                    <span className="font-semibold text-slate-800">Modo demonstração</span>
                    <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-500">
                      Indicadores de exemplo, sem execução da análise no servidor.
                    </span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={fillHallucinationExample}
                  className="w-full rounded-xl border border-jud-accent/30 bg-white px-4 py-3 text-center text-sm font-semibold leading-snug text-jud-accent shadow-sm transition hover:border-jud-accent/50 hover:bg-slate-50/90"
                >
                  Carregar exemplo duvidoso
                </button>
              </div>

              <label htmlFor="juris" className="mt-10 block text-sm font-medium text-slate-800">
                Cole a ementa ou o trecho decisório
              </label>
              <textarea
                id="juris"
                rows={11}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ex.: ementa de agravo, recurso especial, ou texto colado de outra fonte…"
                className="mt-3 min-h-[220px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-[15px] leading-relaxed text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-jud-accent/50 focus:bg-white focus:ring-2 focus:ring-jud-accent/20 sm:min-h-[260px]"
              />

              <button
                type="button"
                disabled={loading || !text.trim()}
                onClick={runAnalyze}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-jud-accent to-[#152a45] px-5 py-4 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading ? (
                  <>
                    <IconLoader className="h-5 w-5" />
                    Processando…
                  </>
                ) : (
                  "Executar análise"
                )}
              </button>

              {clientError && (
                <div
                  className="mt-5 flex gap-3 rounded-2xl border border-red-200/90 bg-red-50/95 px-4 py-3 text-sm text-red-900"
                  role="alert"
                >
                  <span className="mt-0.5 text-red-600" aria-hidden>
                    ●
                  </span>
                  <p>{clientError}</p>
                </div>
              )}
            </div>
          </section>

          <section className="min-w-0 lg:col-span-7">
            {!result && !loading && (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300/90 bg-white/40 px-6 py-12 text-center text-slate-500">
                <IconScale className="mb-4 h-12 w-12 text-slate-400" />
                <p className="max-w-sm text-sm leading-relaxed">
                  Os indicadores de aderência e o painel de alerta aparecem aqui após você
                  executar a análise.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-slate-200/90 bg-white/80 shadow-card">
                <IconLoader className="h-10 w-10 text-jud-accent" />
                <p className="mt-4 text-sm font-medium text-slate-600">Analisando o texto…</p>
              </div>
            )}

            {result && !clientError && (
              <div className="space-y-6">
                {result.mode === "simulation" && (
                  <div className="space-y-3">
                    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-jud-accent/20 bg-slate-100/90 px-4 py-3 text-sm text-slate-800 sm:items-center sm:px-5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-jud-accent/15 text-[10px] font-bold uppercase tracking-wider text-jud-accent"
                        aria-hidden
                      >
                        Demo
                      </span>
                      <p className="min-w-0 flex-1 leading-relaxed">
                        Resultados abaixo são <strong>fixos para apresentação</strong> e não
                        refletem o texto colado na caixa de entrada.
                      </p>
                    </div>
                    {result.demoGenerativeBadge && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950">
                          {result.demoGenerativeBadge}
                        </span>
                      </div>
                    )}
                    {result.demoGenerativeDetail && (
                      <p className="rounded-xl border border-slate-200/90 bg-white/90 px-4 py-3 text-xs leading-relaxed text-slate-700">
                        {result.demoGenerativeDetail}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
                  <article className="min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-7">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Entrada — marcações heurísticas
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      Trechos destacados seguem <strong>padrões suspeitos</strong> (ex.: numeração atípica,
                      súmula não verificada), como apoio visual ao PLN; passe o cursor para ver o motivo.
                    </p>
                    <div className="mt-4">
                      <HighlightedPreview text={text} />
                    </div>
                  </article>
                  <article className="min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-7">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Paralelo: veredito supervisionado
                    </h3>
                    <RagFlowStrip />
                    <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700">
                      <li>
                        <span className="font-semibold text-slate-800">Leitura do modelo (interface):</span>{" "}
                        {verdictLabel}
                      </li>
                      <li>
                        <span className="font-semibold text-slate-800">Índice de confiança:</span>{" "}
                        {result.veracityPercent}%
                      </li>
                      <li>
                        <span className="font-semibold text-slate-800">Aderência à amostra STJ:</span>{" "}
                        {result.similarityPercent}%
                      </li>
                      <li>
                        <span className="font-semibold text-slate-800">Origem do sinal:</span>{" "}
                        {analysisOrigin}
                      </li>
                    </ul>
                    <p className="mt-4 text-xs leading-relaxed text-slate-500">
                      Contraste com o texto bruto: geração plausível versus âncora em evidências da amostra
                      oficial usada no trabalho.
                    </p>
                  </article>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
                  <article className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-jud-accent">
                          <IconScale className="h-5 w-5 shrink-0" />
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                            Índice de confiança
                          </h3>
                          <button
                            type="button"
                            onClick={() => setMetadataOpen(true)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-jud-accent shadow-sm transition hover:bg-slate-50"
                            aria-haspopup="dialog"
                            aria-expanded={metadataOpen}
                          >
                            <IconInfo className="h-3.5 w-3.5" />
                            Ver metadados
                          </button>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{verdictLabel}</p>
                      </div>
                      <span className="shrink-0 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-bold tabular-nums text-slate-800 ring-1 ring-slate-200/80">
                        {result.veracityPercent}%
                      </span>
                    </div>
                    <div className="mt-5">
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/80">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-500 transition-all duration-700 ease-out"
                          style={{ width: `${result.veracityPercent}%` }}
                        />
                      </div>
                      <p className="mt-4 text-center text-2xl font-bold tabular-nums text-slate-900">
                        {result.veracityPercent}
                        <span className="text-base font-semibold text-slate-500">%</span>
                      </p>
                    </div>
                    {result.classification && (
                      <dl className="mt-5 space-y-2.5 border-t border-slate-100 pt-5 text-sm">
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">Origem do sinal</dt>
                          <dd className="text-right font-medium text-slate-900">{analysisOrigin}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">
                            {result.mode === "simulation"
                              ? "Confiança ilustrativa"
                              : "Confiança do modelo"}
                          </dt>
                          <dd className="font-semibold tabular-nums text-slate-900">
                            {(result.classification.confidence * 100).toFixed(1)}%
                          </dd>
                        </div>
                        {result.classification.rawLabel && (
                          <details className="pt-1 text-xs text-slate-500">
                            <summary className="cursor-pointer font-medium text-slate-600">
                              Detalhe técnico da classe
                            </summary>
                            <p className="mt-2 font-mono text-[11px] text-slate-600">
                              {result.classification.rawLabel}
                            </p>
                          </details>
                        )}
                      </dl>
                    )}
                  </article>

                  <article className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-7">
                    <div className="flex items-center gap-2 text-jud-accent">
                      <IconLink className="h-5 w-5" />
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Aderência ao STJ (referência)
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Proximidade estimada em relação a {result.referenceSize ?? "—"} trechos
                      decisórios reais selecionados como referência.
                    </p>
                    <div className="mt-5">
                      <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
                        <span>Distinto do padrão</span>
                        <span>Próximo do padrão</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/80">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-slate-400 to-jud-accent transition-all duration-700 ease-out"
                          style={{ width: `${result.similarityPercent}%` }}
                        />
                      </div>
                      <p className="mt-3 text-center text-2xl font-bold tabular-nums text-slate-900">
                        {result.similarityPercent}
                        <span className="text-base font-semibold text-slate-500">%</span>
                      </p>
                      {similarityInsight && (
                        <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-600">
                          {similarityInsight}
                        </p>
                      )}
                    </div>
                  </article>
                </div>

                <article
                  className={`overflow-hidden rounded-3xl border shadow-card ${
                    result.legalAlert
                      ? "border-rose-200/90 bg-gradient-to-br from-rose-50 to-white"
                      : "border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-white"
                  }`}
                >
                  <div className="flex flex-col gap-5 p-7 sm:flex-row sm:items-start sm:gap-7 sm:p-8">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                        result.legalAlert ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      <IconShield className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {result.legalAlert ? "Atenção: verificação recomendada" : "Situação mais favorável"}
                      </h3>
                      {result.legalAlert ? (
                        <p className="mt-2 text-sm leading-relaxed text-rose-950/90">
                          {result.alertMessage ??
                            "O trecho destoa do padrão da amostra oficial de referência. Não use como citação sem conferir no STJ."}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm leading-relaxed text-emerald-950/85">
                          O texto aproxima-se linguisticamente dos exemplos reais analisados. Ainda
                          assim, confirme números de processo e citações no site oficial do STJ antes
                          de qualquer peça ou parecer.
                        </p>
                      )}
                      {result.classifierNote && result.mode !== "simulation" && (
                        <p className="mt-4 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-xs leading-relaxed text-slate-700">
                          {result.classifierNote}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-16 space-y-6 border-t border-slate-200/80 pt-8 text-center text-xs leading-relaxed text-slate-500">
          <p>
            Ferramenta acadêmica de apoio à leitura crítica. A decisão final sobre citação e uso em
            peças cabe sempre ao profissional, com confirmação na fonte oficial do STJ.
          </p>
          <p className="mx-auto max-w-3xl rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-4 text-slate-600">
            Em conformidade com a governança de inteligência artificial no Poder Judiciário, o
            projeto considera a{" "}
            <strong>Resolução nº 615/2025 do Conselho Nacional de Justiça (CNJ)</strong>, que trata
            do uso responsável de sistemas de IA. Amostra de referência (ementas reais) utilizada no
            experimento: atualização declarada para fins acadêmicos em{" "}
            <strong>{corpusUpdated}</strong>.
          </p>
        </footer>
      </main>
    </div>

    {metadataOpen && (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-4 sm:items-center"
        role="presentation"
        onClick={() => setMetadataOpen(false)}
      >
        <div
          className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="metadata-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="metadata-title" className="text-lg font-bold text-slate-900">
              Metadados técnicos
            </h2>
            <button
              type="button"
              onClick={() => setMetadataOpen(false)}
              className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Os valores abaixo referem-se à <strong>avaliação offline do classificador</strong> no
            conjunto de teste descrito na monografia (acurácia, precisão, revocação e F1-score),
            conforme as definições teóricas citadas no trabalho —{" "}
            <em>não</em> são recalculados a cada clique sobre um único texto.
          </p>
          {displayedEval?.isSimulated && (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs leading-relaxed text-emerald-950">
              <strong>Modo demonstração:</strong> as métricas abaixo são{" "}
              <strong>valores simulados</strong> coerentes com a narrativa do TCC para uso na defesa.
            </p>
          )}
          {!displayedEval?.isSimulated && !offlineMetrics.configured && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              Preencha as variáveis <code className="rounded bg-white/80 px-1">NEXT_PUBLIC_EVAL_*</code>{" "}
              após rodar o experimento no notebook ou script de avaliação, para exibir os números da
              banca.
            </p>
          )}
          <dl className="mt-6 space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Acurácia</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {displayedEval?.accuracy ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Precisão</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {displayedEval?.precision ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Revocação (sensibilidade)</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {displayedEval?.recall ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">F1-score</dt>
              <dd className="font-semibold tabular-nums text-slate-900">{displayedEval?.f1 ?? "—"}</dd>
            </div>
          </dl>
          {confusionDisplay && (
            <>
              <p className="mt-4 text-xs leading-relaxed text-slate-600">{confusionDisplay.caption}</p>
              <ConfusionMatrixVisual
                vp={confusionDisplay.vp}
                fp={confusionDisplay.fp}
                fn={confusionDisplay.fn}
                vn={confusionDisplay.vn}
              />
            </>
          )}
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Fluxo resumido no protótipo
            </p>
            <RagFlowStrip />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Interface alinhada ao relatório de performance do modelo supervisionado (capítulo de
            resultados).
          </p>
          <button
            type="button"
            onClick={() => setMetadataOpen(false)}
            className="mt-6 w-full rounded-xl bg-jud-accent py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Fechar
          </button>
        </div>
      </div>
    )}
    </>
  );
}
