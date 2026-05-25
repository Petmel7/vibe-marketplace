-- Align category hierarchy indexes with the Prisma taxonomy model.
-- The underlying column stays `sort_order`; Prisma now exposes it as `position`.

DROP INDEX IF EXISTS "public"."categories_order_idx";
DROP INDEX IF EXISTS "public"."categories_parentId_order_idx";
DROP INDEX IF EXISTS "public"."idx_categories_parent";

CREATE INDEX IF NOT EXISTS "categories_isActive_idx"
  ON "public"."categories"("is_active" ASC);

CREATE INDEX IF NOT EXISTS "categories_position_idx"
  ON "public"."categories"("sort_order" ASC);

CREATE INDEX IF NOT EXISTS "categories_parentId_position_idx"
  ON "public"."categories"("parent_id" ASC, "sort_order" ASC);

-- Prevent duplicate sibling names while still allowing the same name under different parents.
CREATE UNIQUE INDEX IF NOT EXISTS "categories_root_name_key"
  ON "public"."categories"("name")
  WHERE "parent_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "categories_parentId_name_key"
  ON "public"."categories"("parent_id" ASC, "name" ASC)
  WHERE "parent_id" IS NOT NULL;
