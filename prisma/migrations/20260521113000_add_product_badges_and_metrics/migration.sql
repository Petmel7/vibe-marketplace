DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ProductBadgeType'
  ) THEN
    CREATE TYPE "ProductBadgeType" AS ENUM ('NEW', 'HIT', 'FEATURED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ProductBadgeSource'
  ) THEN
    CREATE TYPE "ProductBadgeSource" AS ENUM ('SYSTEM', 'ADMIN');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "product_badges" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "type" "ProductBadgeType" NOT NULL,
  "source" "ProductBadgeSource" NOT NULL,
  "score" DECIMAL(10, 4),
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "product_badges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_metrics" (
  "product_id" UUID NOT NULL,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "wishlist_count" INTEGER NOT NULL DEFAULT 0,
  "sold_count" INTEGER NOT NULL DEFAULT 0,
  "revenue_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "rating_avg" DECIMAL(3, 2) NOT NULL DEFAULT 0,
  "review_count" INTEGER NOT NULL DEFAULT 0,
  "hit_score" DECIMAL(12, 4) NOT NULL DEFAULT 0,
  "last_calculated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "product_metrics_pkey" PRIMARY KEY ("product_id")
);

CREATE INDEX IF NOT EXISTS "product_badges_type_idx"
ON "product_badges"("type");

CREATE INDEX IF NOT EXISTS "product_badges_active_window_idx"
ON "product_badges"("starts_at", "ends_at");

CREATE INDEX IF NOT EXISTS "product_badges_productId_type_idx"
ON "product_badges"("product_id", "type");

CREATE INDEX IF NOT EXISTS "product_metrics_hitScore_idx"
ON "product_metrics"("hit_score");

CREATE INDEX IF NOT EXISTS "product_metrics_soldCount_idx"
ON "product_metrics"("sold_count");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_badges_product_id_fkey'
  ) THEN
    ALTER TABLE "product_badges"
    ADD CONSTRAINT "product_badges_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_metrics_product_id_fkey'
  ) THEN
    ALTER TABLE "product_metrics"
    ADD CONSTRAINT "product_metrics_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

WITH view_counts AS (
  SELECT
    "product_id",
    COUNT(*)::INTEGER AS "view_count"
  FROM "viewed_products"
  GROUP BY "product_id"
),
wishlist_counts AS (
  SELECT
    "product_id",
    COUNT(*)::INTEGER AS "wishlist_count"
  FROM "wishlist_items"
  GROUP BY "product_id"
),
review_stats AS (
  SELECT
    "product_id",
    COUNT(*)::INTEGER AS "review_count",
    ROUND(COALESCE(AVG("rating")::NUMERIC, 0), 2) AS "rating_avg"
  FROM "reviews"
  GROUP BY "product_id"
),
sales_stats AS (
  SELECT
    pv."product_id",
    COALESCE(SUM(oi."quantity"), 0)::INTEGER AS "sold_count",
    COALESCE(SUM(oi."unit_price_snapshot" * oi."quantity"), 0)::NUMERIC(12, 2) AS "revenue_amount"
  FROM "order_items" oi
  INNER JOIN "product_variants" pv ON pv."id" = oi."variant_id"
  INNER JOIN "orders" o ON o."id" = oi."order_id"
  WHERE o."status" IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')
  GROUP BY pv."product_id"
)
INSERT INTO "product_metrics" (
  "product_id",
  "view_count",
  "wishlist_count",
  "sold_count",
  "revenue_amount",
  "rating_avg",
  "review_count",
  "hit_score",
  "last_calculated_at",
  "created_at",
  "updated_at"
)
SELECT
  p."id" AS "product_id",
  COALESCE(vc."view_count", 0) AS "view_count",
  COALESCE(wc."wishlist_count", 0) AS "wishlist_count",
  COALESCE(ss."sold_count", 0) AS "sold_count",
  COALESCE(ss."revenue_amount", 0)::NUMERIC(12, 2) AS "revenue_amount",
  COALESCE(rs."rating_avg", 0)::NUMERIC(3, 2) AS "rating_avg",
  COALESCE(rs."review_count", 0) AS "review_count",
  ROUND((
    COALESCE(vc."view_count", 0)::NUMERIC * 0.10 +
    COALESCE(wc."wishlist_count", 0)::NUMERIC * 1.50 +
    COALESCE(ss."sold_count", 0)::NUMERIC * 5.00 +
    COALESCE(rs."rating_avg", 0)::NUMERIC * 2.00 +
    COALESCE(rs."review_count", 0)::NUMERIC * 0.50
  ), 4)::NUMERIC(12, 4) AS "hit_score",
  CURRENT_TIMESTAMP AS "last_calculated_at",
  CURRENT_TIMESTAMP AS "created_at",
  CURRENT_TIMESTAMP AS "updated_at"
FROM "products" p
LEFT JOIN view_counts vc ON vc."product_id" = p."id"
LEFT JOIN wishlist_counts wc ON wc."product_id" = p."id"
LEFT JOIN review_stats rs ON rs."product_id" = p."id"
LEFT JOIN sales_stats ss ON ss."product_id" = p."id"
ON CONFLICT ("product_id") DO UPDATE
SET
  "view_count" = EXCLUDED."view_count",
  "wishlist_count" = EXCLUDED."wishlist_count",
  "sold_count" = EXCLUDED."sold_count",
  "revenue_amount" = EXCLUDED."revenue_amount",
  "rating_avg" = EXCLUDED."rating_avg",
  "review_count" = EXCLUDED."review_count",
  "hit_score" = EXCLUDED."hit_score",
  "last_calculated_at" = EXCLUDED."last_calculated_at",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "product_badges" (
  "id",
  "product_id",
  "type",
  "source",
  "score",
  "starts_at",
  "ends_at",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  p."id",
  'NEW'::"ProductBadgeType",
  'SYSTEM'::"ProductBadgeSource",
  NULL,
  p."published_at",
  p."published_at" + INTERVAL '30 days',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "products" p
WHERE p."published_at" IS NOT NULL
  AND p."published_at" >= CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1
    FROM "product_badges" pb
    WHERE pb."product_id" = p."id"
      AND pb."type" = 'NEW'::"ProductBadgeType"
      AND pb."source" = 'SYSTEM'::"ProductBadgeSource"
  );

INSERT INTO "product_badges" (
  "id",
  "product_id",
  "type",
  "source",
  "score",
  "starts_at",
  "ends_at",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  p."id",
  'HIT'::"ProductBadgeType",
  'ADMIN'::"ProductBadgeSource",
  pm."hit_score",
  CURRENT_TIMESTAMP,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "products" p
INNER JOIN "product_metrics" pm ON pm."product_id" = p."id"
WHERE p."is_hit" = true
  AND NOT EXISTS (
    SELECT 1
    FROM "product_badges" pb
    WHERE pb."product_id" = p."id"
      AND pb."type" = 'HIT'::"ProductBadgeType"
      AND pb."source" = 'ADMIN'::"ProductBadgeSource"
  );
