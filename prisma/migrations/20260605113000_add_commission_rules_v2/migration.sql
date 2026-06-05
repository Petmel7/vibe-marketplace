-- CreateEnum
CREATE TYPE "CommissionRuleScope" AS ENUM ('GLOBAL', 'STORE', 'CATEGORY');

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "CommissionRuleScope" NOT NULL,
    "store_id" UUID,
    "category_id" TEXT,
    "rate" DECIMAL(5,4) NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commission_rules_scope_idx" ON "commission_rules"("scope");

-- CreateIndex
CREATE INDEX "commission_rules_store_id_idx" ON "commission_rules"("store_id");

-- CreateIndex
CREATE INDEX "commission_rules_category_id_idx" ON "commission_rules"("category_id");

-- CreateIndex
CREATE INDEX "commission_rules_is_active_idx" ON "commission_rules"("is_active");

-- CreateIndex
CREATE INDEX "commission_rules_starts_at_idx" ON "commission_rules"("starts_at");

-- CreateIndex
CREATE INDEX "commission_rules_ends_at_idx" ON "commission_rules"("ends_at");

-- CreateIndex
CREATE INDEX "commission_rules_priority_idx" ON "commission_rules"("priority");

-- CreateIndex
CREATE INDEX "commission_rules_created_by_id_idx" ON "commission_rules"("created_by_id");

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "commission_rules"
ADD CONSTRAINT "commission_rules_scope_target_check"
CHECK (
    ("scope" = 'GLOBAL' AND "store_id" IS NULL AND "category_id" IS NULL)
    OR ("scope" = 'STORE' AND "store_id" IS NOT NULL AND "category_id" IS NULL)
    OR ("scope" = 'CATEGORY' AND "store_id" IS NULL AND "category_id" IS NOT NULL)
);
