-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED', 'HIDDEN');

-- AlterTable
ALTER TABLE "public"."reviews"
  ADD COLUMN "order_item_id" UUID,
  ADD COLUMN "status" "public"."ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "title" TEXT,
  ADD COLUMN "pros" TEXT,
  ADD COLUMN "cons" TEXT,
  ADD COLUMN "seller_reply" TEXT,
  ADD COLUMN "seller_replied_at" TIMESTAMP(3),
  ADD COLUMN "moderated_at" TIMESTAMP(3),
  ADD COLUMN "moderated_by" UUID,
  ADD COLUMN "moderation_reason" TEXT,
  ADD COLUMN "is_verified_purchase" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."product_rating_summaries" (
  "product_id" UUID NOT NULL,
  "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "rating_count" INTEGER NOT NULL DEFAULT 0,
  "rating_1_count" INTEGER NOT NULL DEFAULT 0,
  "rating_2_count" INTEGER NOT NULL DEFAULT 0,
  "rating_3_count" INTEGER NOT NULL DEFAULT 0,
  "rating_4_count" INTEGER NOT NULL DEFAULT 0,
  "rating_5_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_rating_summaries_pkey" PRIMARY KEY ("product_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_order_item_id_key" ON "public"."reviews"("order_item_id");

-- CreateIndex
CREATE INDEX "reviews_product_id_status_idx" ON "public"."reviews"("product_id", "status");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "public"."reviews"("rating");

-- CreateIndex
CREATE INDEX "reviews_is_verified_purchase_idx" ON "public"."reviews"("is_verified_purchase");

-- CreateIndex
CREATE INDEX "reviews_created_at_idx" ON "public"."reviews"("created_at");

-- AddForeignKey
ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_order_item_id_fkey"
  FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_moderated_by_fkey"
  FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_rating_summaries"
  ADD CONSTRAINT "product_rating_summaries_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- Backfill rating summaries from existing published reviews
INSERT INTO "public"."product_rating_summaries" (
  "product_id",
  "rating_avg",
  "rating_count",
  "rating_1_count",
  "rating_2_count",
  "rating_3_count",
  "rating_4_count",
  "rating_5_count",
  "updated_at"
)
SELECT
  "product_id",
  ROUND(AVG("rating")::NUMERIC, 2)::DECIMAL(3,2) AS "rating_avg",
  COUNT(*)::INTEGER AS "rating_count",
  COUNT(*) FILTER (WHERE "rating" = 1)::INTEGER AS "rating_1_count",
  COUNT(*) FILTER (WHERE "rating" = 2)::INTEGER AS "rating_2_count",
  COUNT(*) FILTER (WHERE "rating" = 3)::INTEGER AS "rating_3_count",
  COUNT(*) FILTER (WHERE "rating" = 4)::INTEGER AS "rating_4_count",
  COUNT(*) FILTER (WHERE "rating" = 5)::INTEGER AS "rating_5_count",
  CURRENT_TIMESTAMP
FROM "public"."reviews"
WHERE "status" = 'PUBLISHED'
GROUP BY "product_id"
ON CONFLICT ("product_id") DO UPDATE
SET
  "rating_avg" = EXCLUDED."rating_avg",
  "rating_count" = EXCLUDED."rating_count",
  "rating_1_count" = EXCLUDED."rating_1_count",
  "rating_2_count" = EXCLUDED."rating_2_count",
  "rating_3_count" = EXCLUDED."rating_3_count",
  "rating_4_count" = EXCLUDED."rating_4_count",
  "rating_5_count" = EXCLUDED."rating_5_count",
  "updated_at" = CURRENT_TIMESTAMP;
