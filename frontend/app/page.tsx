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
  embeddingModel: string;
  classifierModel: string | null;
  referenceSize?: number;
  error?: string;
};

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
        setClientError(data.error ?? "Falha na análise.");
        return;
      }
      setResult(data);
    } catch {
      setClientError("Não foi possível contatar o servidor.");
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
      ? "Provável jurisprudência consistente"
      : result?.classification?.verdict === "alucinada"
        ? "Provável alucinação / texto duvidoso"
        : result?.classification
          ? "Veredito incerto"
          : "Somente similaridade (sem classificador no Hub)";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-amber-800">
          TCC — Engenharia de Software
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
          Verificação de confiabilidade de jurisprudência
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Interface na Vercel (Next.js) com inferência no Hugging Face: similaridade
          semântica com trechos reais de referência e, opcionalmente, classificador
          binário publicado após o fine-tuning do BERTimbau.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={simulation}
              onChange={(e) => setSimulation(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-jud-accent focus:ring-jud-accent"
            />
            Modo simulação (demo estável para banca)
          </label>
          <button
            type="button"
            onClick={fillHallucinationExample}
            className="rounded-lg border border-amber-700/40 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
          >
            Exemplo de alucinação
          </button>
        </div>

        <label htmlFor="juris" className="mt-6 block text-sm font-medium text-slate-800">
          Texto da jurisprudência
        </label>
        <textarea
          id="juris"
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cole ementa, trecho de acórdão ou texto gerado por LLM…"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 shadow-inner outline-none ring-jud-accent focus:border-jud-accent focus:ring-2"
        />

        <button
          type="button"
          disabled={loading || !text.trim()}
          onClick={runAnalyze}
          className="mt-4 w-full rounded-xl bg-jud-accent px-4 py-3 text-center text-sm font-semibold text-white shadow transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[200px]"
        >
          {loading ? "Analisando…" : "Analisar confiabilidade"}
        </button>

        {clientError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {clientError}
          </p>
        )}
      </section>

      {result && !clientError && (
        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Termômetro de veracidade</h2>
            <p className="mt-1 text-sm text-slate-500">{verdictLabel}</p>
            <div className="mt-4">
              <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-600 transition-all duration-700"
                  style={{ width: `${result.veracityPercent}%` }}
                />
              </div>
              <p className="mt-2 text-right text-2xl font-bold tabular-nums text-slate-900">
                {result.veracityPercent}%
              </p>
            </div>
            {result.classification && (
              <dl className="mt-4 space-y-1 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <dt>Fonte do veredito</dt>
                  <dd className="font-medium text-slate-900">
                    {result.classification.source === "hf_classifier"
                      ? "Modelo no Hub"
                      : result.mode === "simulation"
                        ? "Simulação"
                        : "—"}
                  </dd>
                </div>
                {result.classification.rawLabel && (
                  <div className="flex justify-between gap-4">
                    <dt>Classe (Hub)</dt>
                    <dd className="text-right font-mono text-xs text-slate-800">
                      {result.classification.rawLabel}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt>Confiança</dt>
                  <dd className="font-medium text-slate-900">
                    {(result.classification.confidence * 100).toFixed(1)}%
                  </dd>
                </div>
              </dl>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Similaridade com a base STJ (referência)</h2>
            <p className="mt-1 text-sm text-slate-500">
              Máximo cosseno em relação a {result.referenceSize ?? "—"} trechos indexados no
              protótipo.
            </p>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Distante</span>
                <span>Próximo</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-jud-accent transition-all duration-700"
                  style={{ width: `${result.similarityPercent}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Cosseno máximo:{" "}
                <span className="font-mono font-semibold">{result.similarityMax.toFixed(4)}</span>{" "}
                · Indicador:{" "}
                <span className="font-semibold">{result.similarityPercent}%</span>
              </p>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-6 shadow-sm lg:col-span-2 ${
              result.legalAlert
                ? "border-rose-300 bg-rose-50"
                : "border-emerald-200 bg-emerald-50/60"
            }`}
          >
            <h2 className="text-lg font-semibold text-slate-900">Alerta de insegurança jurídica</h2>
            {result.legalAlert ? (
              <p className="mt-2 text-sm text-rose-900">
                {result.alertMessage ??
                  "Baixa aderência semântica à amostra de referência: trate como não verificada na base oficial."}
              </p>
            ) : (
              <p className="mt-2 text-sm text-emerald-900">
                Aderência semântica acima do limiar configurado. Ainda assim, confirme sempre no
                portal do STJ.
              </p>
            )}
            {result.classifierNote && (
              <p className="mt-4 border-t border-black/10 pt-4 text-xs text-slate-700">
                <strong>Classificador:</strong> {result.classifierNote}
              </p>
            )}
            <p className="mt-3 font-mono text-[11px] text-slate-500">
              Embeddings: {result.embeddingModel}
              {result.classifierModel ? ` · Classificação: ${result.classifierModel}` : ""}
            </p>
          </div>
        </section>
      )}

      <footer className="mt-12 text-center text-xs text-slate-500">
        Camada de apresentação (Vercel) desacoplada da inferência (Hugging Face). Token apenas no
        servidor.
      </footer>
    </main>
  );
}
