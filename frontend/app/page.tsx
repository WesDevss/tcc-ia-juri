"use client";

import { useState } from "react";
import { EXAMPLE_HALLUCINATION_TEXT } from "@/lib/demo-text";

type AnalyzeResponse = {
  mode: string;
  similarityMax: number;
  similarityPercent: number;
  veracityPercent: number;
  classification: {
    verdict: string;
    confidence: number;
    rawLabel?: string;
    source: string;
  } | null;
  classifierNote?: string | null;
  legalAlert: boolean;
  alertMessage?: string | null;
  referenceSize?: number;
  error?: string;
};

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

  async function runAnalyze() {
    setClientError(null);
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
    <div className="bg-app-grid min-h-screen overflow-x-hidden">
      <main className="mx-auto max-w-5xl min-w-0 px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-12">
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
                  <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-jud-accent/20 bg-slate-100/90 px-4 py-3 text-sm text-slate-800 sm:items-center sm:px-5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-jud-accent/15 text-[10px] font-bold uppercase tracking-wider text-jud-accent"
                      aria-hidden
                    >
                      Demo
                    </span>
                    <p className="min-w-0 flex-1 leading-relaxed">
                      Resultados abaixo são <strong>fixos para apresentação</strong> e não refletem o
                      texto colado na caixa de entrada.
                    </p>
                  </div>
                )}

                <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
                  <article className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-7">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-jud-accent">
                          <IconScale className="h-5 w-5 shrink-0" />
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                            Índice de confiança
                          </h3>
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

        <footer className="mt-16 border-t border-slate-200/80 pt-8 text-center text-xs leading-relaxed text-slate-500">
          Ferramenta acadêmica de apoio à leitura crítica. A decisão final sobre citação e uso em
          peças cabe sempre ao profissional, com confirmação na fonte oficial do STJ.
        </footer>
      </main>
    </div>
  );
}
