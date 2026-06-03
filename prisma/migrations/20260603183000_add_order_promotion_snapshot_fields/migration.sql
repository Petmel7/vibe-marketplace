-- AlterTable
ALTER TABLE "order_promotions"
ADD COLUMN "owner_type" "PromotionOwnerType",
ADD COLUMN "store_id" UUID,
ADD COLUMN "promotion_name" TEXT,
ADD COLUMN "discount_type" "PromotionDiscountType",
ADD COLUMN "discount_value" DECIMAL(12,2);

-- Backfill immutable snapshot fields from the linked promotion where possible
UPDATE "order_promotions" AS op
SET
  "owner_type" = p."owner_type",
  "store_id" = p."store_id",
  "promotion_name" = p."name",
  "discount_type" = p."discount_type",
  "discount_value" = p."discount_value"
FROM "promotions" AS p
WHERE op."promotion_id" = p."id";

-- Required snapshot fields become non-null after backfill
ALTER TABLE "order_promotions"
ALTER COLUMN "owner_type" SET NOT NULL,
ALTER COLUMN "discount_type" SET NOT NULL,
ALTER COLUMN "discount_value" SET NOT NULL;

-- CreateIndex
CREATE INDEX "order_promotions_owner_type_idx" ON "order_promotions"("owner_type");

-- CreateIndex
CREATE INDEX "order_promotions_store_id_idx" ON "order_promotions"("store_id");
