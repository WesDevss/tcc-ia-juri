import { NextResponse } from "next/server";
import { STJ_REFERENCE_SNIPPETS } from "@/lib/stj-reference";
import {
  cosineSimilarity,
  cosineToPercent,
  rawToEmbeddingVector,
} from "@/lib/embeddings";
import { huggingFacePost } from "@/lib/hf-fetch";

const EMBEDDING_MODEL =
  process.env.HF_EMBEDDING_MODEL ?? "rufimelo/Legal-BERTimbau-sts-large-ma-v3";

/** Cosseno abaixo disso → alerta de baixa aderência à base de referência. */
const SIMILARITY_ALERT_BELOW = Number(
  process.env.SIMILARITY_ALERT_THRESHOLD ?? "0.38"
);

type HFClassificationRow = { label: string; score: number };

function mapClassificationLabel(label: string): "real" | "alucinada" | "desconhecido" {
  const u = label.toUpperCase();
  if (
    u.includes("REAL") ||
    u.includes("VERDADE") ||
    u.includes("LABEL_1") ||
    u.endsWith("_1")
  ) {
    return "real";
  }
  if (
    u.includes("FALS") ||
    u.includes("ALUC") ||
    u.includes("FAKE") ||
    u.includes("LABEL_0") ||
    u.endsWith("_0")
  ) {
    return "alucinada";
  }
  return "desconhecido";
}

async function embed(
  token: string,
  text: string
): Promise<number[]> {
  const raw = await huggingFacePost<unknown>(token, EMBEDDING_MODEL, {
    inputs: text.slice(0, 8000),
  });
  return rawToEmbeddingVector(raw);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      text?: string;
      simulation?: boolean;
    };

    const text = (body.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Informe o texto da jurisprudência." }, { status: 400 });
    }

    if (body.simulation) {
      return NextResponse.json({
        mode: "simulation",
        similarityMax: 0.14,
        similarityPercent: cosineToPercent(0.14),
        veracityPercent: 18,
        classification: {
          verdict: "alucinada" as const,
          confidence: 0.92,
          source: "simulation",
        },
        legalAlert: true,
        alertMessage:
          "Demonstração acadêmica: indicadores ilustrativos, sem chamada ao serviço de análise.",
        demoGenerativeBadge:
          "Hipótese de trabalho: inconsistência típica de modelo generativo (LLM)",
        demoGenerativeDetail:
          "Este exemplo reproduz padrões frequentes de alucinação factual: numeração de recurso inexistente e citação de súmula apócrifa. Em defesa acadêmica, associa-se a respostas não verificadas de assistentes de IA generativa.",
        referenceSize: STJ_REFERENCE_SNIPPETS.length,
      });
    }

    const token = process.env.HUGGING_FACE_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          error:
            "O serviço de análise não está disponível: configure as credenciais do ambiente com o administrador do sistema.",
        },
        { status: 500 }
      );
    }

    const userVec = await embed(token, text);
    const refVecs = await Promise.all(
      STJ_REFERENCE_SNIPPETS.map((s) => embed(token, s))
    );

    let similarityMax = -1;
    for (const rv of refVecs) {
      const s = cosineSimilarity(userVec, rv);
      if (s > similarityMax) similarityMax = s;
    }

    const similarityPercent = cosineToPercent(similarityMax);
    const legalAlert = similarityMax < SIMILARITY_ALERT_BELOW;

    let classification: {
      verdict: "real" | "alucinada" | "desconhecido";
      confidence: number;
      rawLabel?: string;
      source: "hf_classifier" | "similarity_only";
    } | null = null;
    let classifierNote: string | null = null;

    const clfId = process.env.HF_CLASSIFIER_MODEL_ID?.trim();
    if (clfId) {
      try {
        const clfRaw = await huggingFacePost<
          HFClassificationRow[] | HFClassificationRow
        >(token, clfId, {
          inputs: text.slice(0, 8000),
        });
        const ranked = (Array.isArray(clfRaw) ? clfRaw : [clfRaw]).filter(Boolean);
        const top = ranked.sort((a, b) => b.score - a.score)[0];
        if (top) {
          const verdict = mapClassificationLabel(top.label);
          classification = {
            verdict,
            confidence: top.score,
            rawLabel: top.label,
            source: "hf_classifier",
          };
        }
      } catch {
        classifierNote =
          "O classificador automático não respondeu. A leitura por proximidade com a base de referência segue válida.";
      }
    } else {
      classifierNote =
        "O veredito por modelo supervisionado completo será exibido quando o modelo treinado pelo projeto estiver publicado e ligado ao sistema.";
    }

    let veracityPercent = similarityPercent;
    if (classification?.source === "hf_classifier") {
      const confPct = Math.round(classification.confidence * 100);
      if (classification.verdict === "real") {
        veracityPercent = Math.round((similarityPercent + confPct) / 2);
      } else {
        veracityPercent = Math.round((100 - confPct + (100 - similarityPercent)) / 2);
      }
    }

    return NextResponse.json({
      mode: "live",
      similarityMax,
      similarityPercent,
      veracityPercent: Math.max(0, Math.min(100, veracityPercent)),
      classification,
      classifierNote,
      legalAlert,
      alertMessage: legalAlert
        ? "Baixa convergência com o padrão linguístico da amostra oficial de referência: trate o trecho como não verificado até consulta no STJ."
        : null,
      referenceSize: STJ_REFERENCE_SNIPPETS.length,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Não foi possível concluir a análise agora. Tente novamente em instantes ou ative o modo demonstração.",
      },
      { status: 502 }
    );
  }
}
