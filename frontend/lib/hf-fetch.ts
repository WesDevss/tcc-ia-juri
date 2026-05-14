const HF_MODEL_URL = (model: string) =>
  `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;

export async function huggingFacePost<T>(
  token: string,
  modelId: string,
  payload: { inputs: unknown; parameters?: Record<string, unknown> }
): Promise<T> {
  const res = await fetch(HF_MODEL_URL(modelId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: payload.inputs,
      parameters: payload.parameters,
      options: { wait_for_model: true },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Falha na Inference API (${modelId}): HTTP ${res.status} — ${text.slice(0, 400)}`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Resposta não JSON da API (${modelId}).`);
  }
}
