# IA Juri — Dashboard (Next.js + Vercel)

Interface do experimento de confiabilidade: **frontend** na Vercel e **inferência** na [Hugging Face Inference API](https://huggingface.co/docs/api-inference).

## Arquitetura

- **Vercel**: hospeda o Next.js (formulário, gráficos, modo simulação).
- **Hugging Face**: executa o modelo de embeddings (`feature-extraction`) para similaridade semântica.
- **Classificador binário**: deve ser o **BERTimbau fine-tuned** exportado para o Hub. Defina `HF_CLASSIFIER_MODEL_ID` com o repositório publicado (ex.: `usuario/bertimbau-juris-clf`). O modelo base `neuralmind/bert-base-portuguese-cased` **não** resolve a tarefa de “real vs alucinada” na API pública.

## Configuração local

```bash
cd frontend
cp .env.example .env.local
# Edite .env.local e cole HUGGING_FACE_TOKEN
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Publicar no GitHub

Na raiz do monorepo (`TCC - IA JURI`), o Git já está inicializado com um commit na branch `main`. Falta criar o repositório remoto e enviar o código.

1. No GitHub: **New repository** → nome sugerido: `tcc-ia-juri` → **sem** README (o projeto já tem conteúdo).
2. No PowerShell, na pasta do projeto:

```powershell
cd "c:\Users\Wesley\Desktop\TCC - IA JURI"
git remote add origin https://github.com/SEU_USUARIO/tcc-ia-juri.git
git push -u origin main
```

Substitua `SEU_USUARIO` e o nome do repositório pelo seu. Se o GitHub pedir login, use um [Personal Access Token](https://github.com/settings/tokens) como senha ou o **GitHub Desktop**.

## Variáveis de ambiente (Vercel)

No painel do projeto: **Settings → Environment Variables**:

| Nome | Obrigatório | Descrição |
|------|-------------|-----------|
| `HUGGING_FACE_TOKEN` | Sim | Token Read em [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| `HF_CLASSIFIER_MODEL_ID` | Não | ID do modelo de **classificação de sequência** no Hub (após fine-tuning) |
| `HF_EMBEDDING_MODEL` | Não | Padrão: `rufimelo/Legal-BERTimbau-sts-large-ma-v3` |
| `SIMILARITY_ALERT_THRESHOLD` | Não | Padrão `0.38` — cosseno máximo abaixo disso aciona o alerta |
| `NEXT_PUBLIC_EVAL_ACCURACY` | Não | Proporção 0–1 ou %; exibida no modal **Ver metadados** |
| `NEXT_PUBLIC_EVAL_PRECISION` | Não | Idem |
| `NEXT_PUBLIC_EVAL_RECALL` | Não | Idem |
| `NEXT_PUBLIC_EVAL_F1` | Não | Idem |
| `NEXT_PUBLIC_REFERENCE_CORPUS_UPDATED_AT` | Não | Texto livre (ex.: `maio de 2026`) para o rodapé de conformidade |

## Deploy na Vercel

1. Envie o repositório para o GitHub (ou Git integrado).
2. Em [vercel.com](https://vercel.com): **Add New Project** → importe o repositório.
3. **Root Directory**: defina como `frontend` (monorepo com pasta Python na raiz).
4. Framework Preset: **Next.js** (detectado automaticamente).
5. Adicione as variáveis de ambiente acima.
6. **Deploy**.

Primeira chamada a um modelo cold pode demorar (a API usa `wait_for_model: true`). Para apresentação, use o **Modo simulação** ou clique em **Exemplo de alucinação** e depois analise com simulação ligada.

## Modo simulação

Com a caixa **Modo simulação** marcada, a rota `/api/analyze` devolve um resultado fixo **sem** chamar a Hugging Face — útil se a rede oscilar na banca.

## Referência STJ no protótipo

Os trechos em `lib/stj-reference.ts` são uma **amostra** para demonstração. Em produção acadêmica, substitua por trechos reais exportados do portal do STJ ou pipeline de dados abertos, mantendo a mesma interface.
