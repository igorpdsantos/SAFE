/** Série pública agregada da aba "Entenda os dados" (SPEC-14). Valores como string (SPEC-01 §4.1). */
export interface ContextSeries {
  id: string;
  name: string;
  source: string;
  url: string;
  /** AAAA-MM-DD */
  extractedAt: string;
  unit: string;
  points: { date: string; value: string }[];
}
