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
          "Modo simulação: valores fixos para demonstração (rede ou API indisponíveis).",
        embeddingModel: EMBEDDING_MODEL,
        classifierModel: process.env.HF_CLASSIFIER_MODEL_ID ?? null,
      });
    }

    const token = process.env.HUGGING_FACE_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          error:
            "Defina HUGGING_FACE_TOKEN nas variáveis de ambiente (Vercel ou .env.local).",
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
      } catch (e) {
        classifierNote =
          e instanceof Error
            ? e.message
            : "Falha na classificação via Hub.";
      }
    } else {
      classifierNote =
        "Nenhum HF_CLASSIFIER_MODEL_ID configurado. Publique o BERTimbau fine-tuned no Hugging Face e defina o ID do repositório (classificação binária). O endpoint público de neuralmind/bert-base-portuguese-cased não realiza essa tarefa.";
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
        ? "Baixa similaridade semântica com a amostra de referência do STJ: possível alucinação ou texto fora do padrão da base indexada."
        : null,
      embeddingModel: EMBEDDING_MODEL,
      classifierModel: clfId || null,
      referenceSize: STJ_REFERENCE_SNIPPETS.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
