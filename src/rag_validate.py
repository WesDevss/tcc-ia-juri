"""
Camada de validação semântica (RAG leve): embeddings Legal-BERTimbau + similaridade de cosseno.

Compara textos candidatos (ex.: saída de LLM) com um índice de jurisprudência REAL (label=1).
Se a similaridade máxima com a base oficial ficar abaixo de um limiar, sinaliza possível alucinação.
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Iterable, List, Sequence, Tuple

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer


def _l2_normalize(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms = np.maximum(norms, 1e-12)
    return vectors / norms


def cosine_similarity_matrix(query_emb: np.ndarray, corpus_emb: np.ndarray) -> np.ndarray:
    """query_emb: (1, d), corpus_emb: (n, d) -> (n,) scores."""
    q = _l2_normalize(query_emb)
    c = _l2_normalize(corpus_emb)
    return (c @ q.T).flatten()


def load_text_column(df: pd.DataFrame) -> pd.Series:
    if "texto" in df.columns:
        return df["texto"].astype(str)
    if "text" in df.columns:
        return df["text"].astype(str)
    raise ValueError("O dataset precisa da coluna 'texto' ou 'text'.")


def build_corpus_embeddings(
    model: SentenceTransformer,
    real_texts: Sequence[str],
    batch_size: int = 32,
) -> np.ndarray:
    return np.asarray(
        model.encode(list(real_texts), batch_size=batch_size, show_progress_bar=True)
    )


def validate_queries(
    model: SentenceTransformer,
    corpus_emb: np.ndarray,
    corpus_ids: List[str],
    queries: Sequence[str],
    min_similarity: float,
    batch_size: int = 16,
) -> List[dict]:
    out: List[dict] = []
    for i in range(0, len(queries), batch_size):
        batch = list(queries[i : i + batch_size])
        q_emb = np.asarray(model.encode(batch, show_progress_bar=False))
        for j, q in enumerate(batch):
            scores = cosine_similarity_matrix(q_emb[j : j + 1], corpus_emb)
            best_idx = int(np.argmax(scores))
            best_score = float(scores[best_idx])
            flagged = best_score < min_similarity
            out.append(
                {
                    "query_index": i + j,
                    "max_cosine_similarity": best_score,
                    "best_corpus_id": corpus_ids[best_idx],
                    "flagged_low_similarity": flagged,
                    "min_similarity_threshold": min_similarity,
                }
            )
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Validação semântica RAG (Legal-BERTimbau + cosseno).")
    parser.add_argument(
        "--dataset",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "..", "data", "dataset_exemplo.csv"),
        help="CSV com colunas texto/texto + label (1=real).",
    )
    parser.add_argument(
        "--embedding-model",
        type=str,
        default="rufimelo/Legal-BERTimbau-sts-large-ma-v3",
        help="Modelo de embeddings para STS / similaridade.",
    )
    parser.add_argument(
        "--min-similarity",
        type=float,
        default=0.35,
        help="Abaixo deste valor de similaridade de cosseno, sinaliza possível alucinação.",
    )
    parser.add_argument(
        "--queries-json",
        type=str,
        default=None,
        help="JSON com lista de strings em 'queries'. Se omitido, usa textos com label=0 do CSV.",
    )
    parser.add_argument(
        "--out",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "..", "logs", "rag_validation.json"),
    )
    args = parser.parse_args()

    df = pd.read_csv(args.dataset)
    if "label" not in df.columns:
        raise ValueError("Coluna 'label' obrigatória (0=falso, 1=real).")

    texts = load_text_column(df)
    real_mask = df["label"].astype(int) == 1
    real_df = df.loc[real_mask].reset_index(drop=True)
    real_texts = load_text_column(real_df).tolist()
    corpus_ids = [f"real_{k}" for k in range(len(real_texts))]

    if args.queries_json:
        with open(args.queries_json, encoding="utf-8") as f:
            payload = json.load(f)
        queries: List[str] = list(payload["queries"])
    else:
        fake_mask = df["label"].astype(int) == 0
        queries = load_text_column(df.loc[fake_mask]).tolist()

    print(f"Carregando modelo de embeddings: {args.embedding_model}")
    model = SentenceTransformer(args.embedding_model)

    print("Indexando corpus REAL (label=1)...")
    corpus_emb = build_corpus_embeddings(model, real_texts)

    print(f"Avaliando {len(queries)} consulta(s)...")
    results = validate_queries(
        model=model,
        corpus_emb=corpus_emb,
        corpus_ids=corpus_ids,
        queries=queries,
        min_similarity=args.min_similarity,
    )

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump({"results": results, "corpus_size": len(real_texts)}, f, ensure_ascii=False, indent=2)
    print(f"Relatório salvo em: {args.out}")


if __name__ == "__main__":
    main()
