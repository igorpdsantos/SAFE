-- CreateTable
CREATE TABLE "usuario" (
    "user_id" SERIAL NOT NULL,
    "user_email" VARCHAR(254) NOT NULL,
    "oauth_subject" VARCHAR(255) NOT NULL,
    "dt_criacao" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" VARCHAR(8) NOT NULL DEFAULT 'ATIVO',
    "last_login_at" TIMESTAMPTZ(3),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "aceitacao_termos" (
    "record_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "terms_version" VARCHAR(10) NOT NULL,
    "privacy_version" VARCHAR(10) NOT NULL,
    "age_confirmed" BOOLEAN NOT NULL,
    "dt_accept_terms" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_id" UUID NOT NULL,

    CONSTRAINT "aceitacao_termos_pkey" PRIMARY KEY ("record_id")
);

-- CreateTable
CREATE TABLE "renda" (
    "rent_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "description" BYTEA,
    "month_value" DECIMAL(15,2) NOT NULL,
    "dt_user_creation" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified_date" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renda_pkey" PRIMARY KEY ("rent_id")
);

-- CreateTable
CREATE TABLE "despesa" (
    "expense_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "description" BYTEA,
    "category" VARCHAR(30) NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "expense_type" VARCHAR(8) NOT NULL,
    "dt_user_creation" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified_date" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesa_pkey" PRIMARY KEY ("expense_id")
);

-- CreateTable
CREATE TABLE "divida" (
    "debt_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "description" BYTEA,
    "category" VARCHAR(30) NOT NULL,
    "balance_due" DECIMAL(15,2),
    "value_installment" DECIMAL(15,2) NOT NULL,
    "total_installment" INTEGER,
    "qtd_installment_remains" INTEGER NOT NULL,
    "reference_date" DATE NOT NULL,
    "dt_user_creation" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified_date" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "divida_pkey" PRIMARY KEY ("debt_id")
);

-- CreateTable
CREATE TABLE "reserva_financeira" (
    "reserve_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "description" BYTEA,
    "reserve_value" DECIMAL(15,2) NOT NULL,
    "dt_user_creation" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_modified_date" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserva_financeira_pkey" PRIMARY KEY ("reserve_id")
);

-- CreateTable
CREATE TABLE "indicador_financeiro" (
    "kpi_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "rent_perc" DECIMAL(9,4) NOT NULL,
    "debt_level" DECIMAL(12,4) NOT NULL,
    "financial_liquidity" DECIMAL(12,4),
    "payments_capacity" DECIMAL(15,2) NOT NULL,
    "risk_index" DECIMAL(6,4) NOT NULL,
    "risk_level" SMALLINT NOT NULL,
    "dt_calculated" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "indicador_financeiro_pkey" PRIMARY KEY ("kpi_id")
);

-- CreateTable
CREATE TABLE "simulacao_financeira" (
    "simulation_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "simulated_value" DECIMAL(15,2) NOT NULL,
    "qtd_installments" INTEGER NOT NULL,
    "value_installment" DECIMAL(15,2) NOT NULL,
    "current_risk" DECIMAL(6,4) NOT NULL,
    "estimated_risk" DECIMAL(6,4) NOT NULL,
    "outcome" VARCHAR(20) NOT NULL,
    "dt_simulation" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" VARCHAR(15) NOT NULL DEFAULT 'ATIVA',

    CONSTRAINT "simulacao_financeira_pkey" PRIMARY KEY ("simulation_id")
);

-- CreateTable
CREATE TABLE "historico_indicadores" (
    "history_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "risk_level" SMALLINT NOT NULL,
    "risk" DECIMAL(6,4) NOT NULL,
    "record_date" DATE NOT NULL,

    CONSTRAINT "historico_indicadores_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "alerta" (
    "alert_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type_alert" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "severity" SMALLINT NOT NULL,
    "dt_alert" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(11) NOT NULL DEFAULT 'NAO_LIDO',

    CONSTRAINT "alerta_pkey" PRIMARY KEY ("alert_id")
);

-- CreateTable
CREATE TABLE "log_auditoria" (
    "log_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "operacao" VARCHAR(30) NOT NULL,
    "entidade" VARCHAR(40) NOT NULL,
    "entidade_id" INTEGER,
    "dt_evento" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detalhes" JSONB,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "consentimento_pesquisa" (
    "consent_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "text_version" VARCHAR(10) NOT NULL,

    CONSTRAINT "consentimento_pesquisa_pkey" PRIMARY KEY ("consent_id")
);

-- CreateTable
CREATE TABLE "exclusoes_pendentes_backup" (
    "user_id" INTEGER NOT NULL,
    "deleted_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exclusoes_pendentes_backup_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_user_email_key" ON "usuario"("user_email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_oauth_subject_key" ON "usuario"("oauth_subject");

-- CreateIndex
CREATE UNIQUE INDEX "aceitacao_termos_token_id_key" ON "aceitacao_termos"("token_id");

-- CreateIndex
CREATE INDEX "aceitacao_termos_user_id_idx" ON "aceitacao_termos"("user_id");

-- CreateIndex
CREATE INDEX "renda_user_id_idx" ON "renda"("user_id");

-- CreateIndex
CREATE INDEX "despesa_user_id_idx" ON "despesa"("user_id");

-- CreateIndex
CREATE INDEX "divida_user_id_idx" ON "divida"("user_id");

-- CreateIndex
CREATE INDEX "reserva_financeira_user_id_idx" ON "reserva_financeira"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "indicador_financeiro_user_id_key" ON "indicador_financeiro"("user_id");

-- CreateIndex
CREATE INDEX "simulacao_financeira_user_id_dt_simulation_idx" ON "simulacao_financeira"("user_id", "dt_simulation");

-- CreateIndex
CREATE UNIQUE INDEX "historico_indicadores_user_id_record_date_key" ON "historico_indicadores"("user_id", "record_date");

-- CreateIndex
CREATE INDEX "alerta_user_id_status_idx" ON "alerta"("user_id", "status");

-- CreateIndex
CREATE INDEX "log_auditoria_user_id_idx" ON "log_auditoria"("user_id");

-- CreateIndex
CREATE INDEX "log_auditoria_dt_evento_idx" ON "log_auditoria"("dt_evento");

-- CreateIndex
CREATE INDEX "consentimento_pesquisa_user_id_idx" ON "consentimento_pesquisa"("user_id");

-- AddForeignKey
ALTER TABLE "aceitacao_termos" ADD CONSTRAINT "aceitacao_termos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renda" ADD CONSTRAINT "renda_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divida" ADD CONSTRAINT "divida_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_financeira" ADD CONSTRAINT "reserva_financeira_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicador_financeiro" ADD CONSTRAINT "indicador_financeiro_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulacao_financeira" ADD CONSTRAINT "simulacao_financeira_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_indicadores" ADD CONSTRAINT "historico_indicadores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimento_pesquisa" ADD CONSTRAINT "consentimento_pesquisa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECKs do PRD §11.2, SEGURANCA_LGPD §11 e SPEC-04 §2 (o Prisma não os gera).
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_state_check" CHECK ("state" IN ('ATIVO', 'INATIVO'));
ALTER TABLE "renda" ADD CONSTRAINT "renda_month_value_check" CHECK ("month_value" > 0);
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_value_check" CHECK ("value" >= 0);
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_expense_type_check" CHECK ("expense_type" IN ('FIXA', 'VARIAVEL'));
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_category_check" CHECK ("category" IN ('MORADIA', 'ALIMENTACAO', 'TRANSPORTE', 'SAUDE', 'EDUCACAO', 'CONTAS_CASA', 'LAZER', 'OUTROS'));
ALTER TABLE "divida" ADD CONSTRAINT "divida_balance_due_check" CHECK ("balance_due" IS NULL OR "balance_due" >= 0);
ALTER TABLE "divida" ADD CONSTRAINT "divida_value_installment_check" CHECK ("value_installment" > 0);
ALTER TABLE "divida" ADD CONSTRAINT "divida_remains_check" CHECK ("qtd_installment_remains" BETWEEN 0 AND 600);
ALTER TABLE "divida" ADD CONSTRAINT "divida_total_check" CHECK ("total_installment" IS NULL OR "total_installment" >= "qtd_installment_remains");
ALTER TABLE "divida" ADD CONSTRAINT "divida_category_check" CHECK ("category" IN ('CARTAO_CREDITO', 'EMPRESTIMO_PESSOAL', 'CONSIGNADO', 'FINANC_VEICULO', 'FINANC_IMOVEL', 'CREDIARIO', 'CHEQUE_ESPECIAL', 'OUTROS'));
ALTER TABLE "reserva_financeira" ADD CONSTRAINT "reserva_value_check" CHECK ("reserve_value" >= 0);
ALTER TABLE "indicador_financeiro" ADD CONSTRAINT "indicador_risk_level_check" CHECK ("risk_level" BETWEEN 1 AND 5);
ALTER TABLE "simulacao_financeira" ADD CONSTRAINT "simulacao_outcome_check" CHECK ("outcome" IN ('SEM_AGRAVAMENTO', 'AGRAVAMENTO', 'CRITICO'));
ALTER TABLE "simulacao_financeira" ADD CONSTRAINT "simulacao_state_check" CHECK ("state" IN ('ATIVA', 'DESCARTADA', 'EFETIVADA'));
ALTER TABLE "simulacao_financeira" ADD CONSTRAINT "simulacao_values_check" CHECK ("simulated_value" > 0 AND "value_installment" > 0 AND "qtd_installments" >= 1);
ALTER TABLE "historico_indicadores" ADD CONSTRAINT "historico_risk_level_check" CHECK ("risk_level" BETWEEN 1 AND 5);
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_severity_check" CHECK ("severity" BETWEEN 1 AND 5);
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_status_check" CHECK ("status" IN ('NAO_LIDO', 'LIDO'));
