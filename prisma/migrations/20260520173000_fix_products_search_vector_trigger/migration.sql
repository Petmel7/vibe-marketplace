ALTER TABLE "public"."products"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

CREATE OR REPLACE FUNCTION "public"."products_search_vector_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := to_tsvector(
    'english',
    concat_ws(' ', coalesce(NEW.name, ''), coalesce(NEW.description, ''))
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS "products_search_vector_trigger" ON "public"."products";

CREATE TRIGGER "products_search_vector_trigger"
BEFORE INSERT OR UPDATE OF "name", "description"
ON "public"."products"
FOR EACH ROW
EXECUTE FUNCTION "public"."products_search_vector_update"();

UPDATE "public"."products"
SET "search_vector" = to_tsvector(
  'english',
  concat_ws(' ', coalesce("name", ''), coalesce("description", ''))
)
WHERE "search_vector" IS NULL
   OR "search_vector" <> to_tsvector(
     'english',
     concat_ws(' ', coalesce("name", ''), coalesce("description", ''))
   );

DROP INDEX IF EXISTS "public"."products_searchvector_idx";

CREATE INDEX IF NOT EXISTS "products_searchVector_idx"
ON "public"."products"
USING GIN ("search_vector");
