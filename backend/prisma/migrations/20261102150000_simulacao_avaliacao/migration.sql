-- T-08.10 (SPEC-08 §3): avaliação da utilidade da simulação de 1 a 5 estrelas.
ALTER TABLE "simulacao_financeira" ADD COLUMN "rating" SMALLINT;

ALTER TABLE "simulacao_financeira" ADD CONSTRAINT "simulacao_financeira_rating_check" CHECK (
  "rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5)
);

