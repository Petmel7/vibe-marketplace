-- CreateEnum
CREATE TYPE "public"."RiskLevel" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

-- CreateEnum
CREATE TYPE "public"."RiskSignalType" AS ENUM (
    'ABUSE_REPORT_CREATED',
    'DISPUTE_OPENED',
    'DISPUTE_LOST',
    'PAYMENT_FAILED',
    'REFUND_ISSUED',
    'PRODUCT_REJECTED',
    'SELLER_SUSPENDED',
    'REVIEW_HIDDEN',
    'ORDER_CANCELLED'
);

-- CreateTable
CREATE TABLE "public"."risk_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "store_id" UUID,
    "score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "level" "public"."RiskLevel" NOT NULL DEFAULT 'LOW',
    "last_calculated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "risk_profiles_user_or_store_check" CHECK (num_nonnulls("user_id", "store_id") = 1)
);

-- CreateTable
CREATE TABLE "public"."risk_signals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "store_id" UUID,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "signal_type" "public"."RiskSignalType" NOT NULL,
    "weight" DECIMAL(10,2) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_signals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "risk_signals_user_or_store_check" CHECK (num_nonnulls("user_id", "store_id") >= 1)
);

-- CreateIndex
CREATE UNIQUE INDEX "risk_profiles_user_id_key"
ON "public"."risk_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_profiles_store_id_key"
ON "public"."risk_profiles"("store_id");

-- CreateIndex
CREATE INDEX "risk_profiles_user_id_idx"
ON "public"."risk_profiles"("user_id");

-- CreateIndex
CREATE INDEX "risk_profiles_store_id_idx"
ON "public"."risk_profiles"("store_id");

-- CreateIndex
CREATE INDEX "risk_profiles_score_idx"
ON "public"."risk_profiles"("score");

-- CreateIndex
CREATE INDEX "risk_profiles_level_idx"
ON "public"."risk_profiles"("level");

-- CreateIndex
CREATE INDEX "risk_signals_user_id_idx"
ON "public"."risk_signals"("user_id");

-- CreateIndex
CREATE INDEX "risk_signals_store_id_idx"
ON "public"."risk_signals"("store_id");

-- CreateIndex
CREATE INDEX "risk_signals_signal_type_idx"
ON "public"."risk_signals"("signal_type");

-- CreateIndex
CREATE INDEX "risk_signals_created_at_idx"
ON "public"."risk_signals"("created_at");

-- AddForeignKey
ALTER TABLE "public"."risk_profiles"
ADD CONSTRAINT "risk_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."risk_profiles"
ADD CONSTRAINT "risk_profiles_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."risk_signals"
ADD CONSTRAINT "risk_signals_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."risk_signals"
ADD CONSTRAINT "risk_signals_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
