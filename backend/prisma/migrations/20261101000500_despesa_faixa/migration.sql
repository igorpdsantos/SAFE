-- T-04.10 (SPEC-04 §2.6): despesa variável com faixa (mínimo X e máximo Y).
-- Migration aditiva: `value` continua sendo o valor usado no cálculo (o máximo, quando há faixa).
ALTER TABLE "despesa" ADD COLUMN "value_min" DECIMAL(15,2),
ADD COLUMN "value_max" DECIMAL(15,2);

-- Despesas variáveis já cadastradas viram faixa com X = Y = valor atual.
UPDATE "despesa" SET "value_min" = "value", "value_max" = "value" WHERE "expense_type" = 'VARIAVEL';

-- CHECKs à mão (o Prisma não os gera): faixa completa ou ausente, mínimo ≤ máximo, value = máximo.
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_range_check" CHECK (
  ("value_min" IS NULL AND "value_max" IS NULL)
  OR ("value_min" IS NOT NULL AND "value_max" IS NOT NULL AND "value_min" >= 0 AND "value_min" <= "value_max" AND "value" = "value_max")
);
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_range_type_check" CHECK (
  "value_min" IS NULL OR "expense_type" = 'VARIAVEL'
);

