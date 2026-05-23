CREATE TABLE "public"."product_badge_rules" (
  "id" UUID NOT NULL,
  "badge_type" "public"."ProductBadgeType" NOT NULL,
  "min_views" INTEGER NOT NULL DEFAULT 0,
  "min_wishlists" INTEGER NOT NULL DEFAULT 0,
  "min_sold_count" INTEGER NOT NULL DEFAULT 0,
  "min_revenue_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by" UUID,

  CONSTRAINT "product_badge_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_badge_rules_badge_type_key"
  ON "public"."product_badge_rules"("badge_type");

CREATE INDEX "product_badge_rules_badge_type_idx"
  ON "public"."product_badge_rules"("badge_type");

CREATE INDEX "product_badge_rules_enabled_idx"
  ON "public"."product_badge_rules"("enabled");

CREATE INDEX "product_badge_rules_updated_by_idx"
  ON "public"."product_badge_rules"("updated_by");

ALTER TABLE "public"."product_badge_rules"
  ADD CONSTRAINT "product_badge_rules_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
