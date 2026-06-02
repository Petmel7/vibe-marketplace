CREATE OR REPLACE FUNCTION "public"."products_search_vector_value"(
  "product_name" text,
  "product_description" text,
  "category_name" text,
  "store_name" text
)
RETURNS tsvector
LANGUAGE sql
STABLE
AS $function$
  SELECT
    setweight(to_tsvector('english', coalesce("product_name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("store_name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("category_name", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("product_description", '')), 'C');
$function$;

CREATE OR REPLACE FUNCTION "public"."products_search_vector_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  "resolved_category_name" text;
  "resolved_store_name" text;
BEGIN
  SELECT c."name"
  INTO "resolved_category_name"
  FROM "public"."categories" c
  WHERE c."id" = NEW."category_id";

  SELECT s."name"
  INTO "resolved_store_name"
  FROM "public"."stores" s
  WHERE s."id" = NEW."store_id";

  NEW."search_vector" := "public"."products_search_vector_value"(
    NEW."name",
    NEW."description",
    "resolved_category_name",
    "resolved_store_name"
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION "public"."refresh_products_search_vector_for_category"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE "public"."products" p
  SET "search_vector" = "public"."products_search_vector_value"(
    p."name",
    p."description",
    NEW."name",
    (
      SELECT s."name"
      FROM "public"."stores" s
      WHERE s."id" = p."store_id"
    )
  )
  WHERE p."category_id" = NEW."id";

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION "public"."refresh_products_search_vector_for_store"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE "public"."products" p
  SET "search_vector" = "public"."products_search_vector_value"(
    p."name",
    p."description",
    (
      SELECT c."name"
      FROM "public"."categories" c
      WHERE c."id" = p."category_id"
    ),
    NEW."name"
  )
  WHERE p."store_id" = NEW."id";

  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS "products_search_vector_trigger" ON "public"."products";

CREATE TRIGGER "products_search_vector_trigger"
BEFORE INSERT OR UPDATE OF "name", "description", "category_id", "store_id"
ON "public"."products"
FOR EACH ROW
EXECUTE FUNCTION "public"."products_search_vector_update"();

DROP TRIGGER IF EXISTS "categories_products_search_vector_refresh_trigger" ON "public"."categories";

CREATE TRIGGER "categories_products_search_vector_refresh_trigger"
AFTER UPDATE OF "name"
ON "public"."categories"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name")
EXECUTE FUNCTION "public"."refresh_products_search_vector_for_category"();

DROP TRIGGER IF EXISTS "stores_products_search_vector_refresh_trigger" ON "public"."stores";

CREATE TRIGGER "stores_products_search_vector_refresh_trigger"
AFTER UPDATE OF "name"
ON "public"."stores"
FOR EACH ROW
WHEN (OLD."name" IS DISTINCT FROM NEW."name")
EXECUTE FUNCTION "public"."refresh_products_search_vector_for_store"();

UPDATE "public"."products" p
SET "search_vector" = "public"."products_search_vector_value"(
  p."name",
  p."description",
  (
    SELECT c."name"
    FROM "public"."categories" c
    WHERE c."id" = p."category_id"
  ),
  (
    SELECT s."name"
    FROM "public"."stores" s
    WHERE s."id" = p."store_id"
  )
)
WHERE p."search_vector" IS NULL
   OR p."search_vector" <> "public"."products_search_vector_value"(
     p."name",
     p."description",
     (
       SELECT c."name"
       FROM "public"."categories" c
       WHERE c."id" = p."category_id"
     ),
     (
       SELECT s."name"
       FROM "public"."stores" s
       WHERE s."id" = p."store_id"
     )
   );

CREATE INDEX IF NOT EXISTS "products_price_idx"
ON "public"."products"("price");

CREATE INDEX IF NOT EXISTS "products_publishedAt_idx"
ON "public"."products"("published_at");

CREATE INDEX IF NOT EXISTS "products_status_isActive_idx"
ON "public"."products"("status", "is_active");

CREATE INDEX IF NOT EXISTS "products_categoryId_status_idx"
ON "public"."products"("category_id", "status");

CREATE INDEX IF NOT EXISTS "products_storeId_status_idx"
ON "public"."products"("store_id", "status");

CREATE INDEX IF NOT EXISTS "product_variants_productId_stock_idx"
ON "public"."product_variants"("product_id", "stock");

CREATE INDEX IF NOT EXISTS "product_metrics_wishlistCount_idx"
ON "public"."product_metrics"("wishlist_count");

CREATE INDEX IF NOT EXISTS "product_metrics_viewCount_idx"
ON "public"."product_metrics"("view_count");

CREATE INDEX IF NOT EXISTS "product_rating_summaries_rating_avg_idx"
ON "public"."product_rating_summaries"("rating_avg");

CREATE INDEX IF NOT EXISTS "product_rating_summaries_rating_count_idx"
ON "public"."product_rating_summaries"("rating_count");

CREATE INDEX IF NOT EXISTS "categories_parentId_isActive_position_idx"
ON "public"."categories"("parent_id", "is_active", "sort_order");
