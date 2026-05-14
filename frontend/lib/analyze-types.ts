export type AnalyzeResponse = {
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
  demoGenerativeBadge?: string | null;
  demoGenerativeDetail?: string | null;
};
