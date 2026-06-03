-- CreateEnum
CREATE TYPE "PromotionOwnerType" AS ENUM ('MARKETPLACE', 'SELLER');

-- CreateEnum
CREATE TYPE "PromotionTargetType" AS ENUM ('STORE', 'PRODUCT', 'CATEGORY');

-- AlterTable
ALTER TABLE "promotions"
ADD COLUMN "owner_type" "PromotionOwnerType" NOT NULL DEFAULT 'MARKETPLACE',
ADD COLUMN "store_id" UUID;

-- Backfill existing marketplace promotions explicitly for migration safety
UPDATE "promotions"
SET "owner_type" = 'MARKETPLACE',
    "store_id" = NULL
WHERE "owner_type" IS DISTINCT FROM 'MARKETPLACE'
   OR "store_id" IS NOT NULL;

-- CreateTable
CREATE TABLE "promotion_targets" (
    "id" UUID NOT NULL,
    "promotion_id" UUID NOT NULL,
    "target_type" "PromotionTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotions_owner_type_idx" ON "promotions"("owner_type");

-- CreateIndex
CREATE INDEX "promotions_store_id_idx" ON "promotions"("store_id");

-- CreateIndex
CREATE INDEX "promotion_targets_promotion_id_idx" ON "promotion_targets"("promotion_id");

-- CreateIndex
CREATE INDEX "promotion_targets_target_type_target_id_idx" ON "promotion_targets"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_targets" ADD CONSTRAINT "promotion_targets_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
