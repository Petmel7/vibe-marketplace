-- Replace the partial unique indexes on viewed_products with full UNIQUE
-- constraints so that Prisma's typed `upsert` (which generates
-- `ON CONFLICT (col1, col2)` without a WHERE predicate) can use them as a
-- conflict target.
--
-- NULL semantics: PostgreSQL treats NULLs as distinct in unique constraints
-- by default (NULLS DISTINCT), so guest rows (user_id IS NULL) remain unique
-- per (session_id, product_id), and authenticated rows (session_id IS NULL)
-- remain unique per (user_id, product_id). The CHECK constraint enforcing
-- exactly one non-null identifier per row is left untouched.

DROP INDEX IF EXISTS idx_viewed_user_product;
DROP INDEX IF EXISTS idx_viewed_session_product;

ALTER TABLE viewed_products
  ADD CONSTRAINT viewed_products_user_id_product_id_key
  UNIQUE (user_id, product_id);

ALTER TABLE viewed_products
  ADD CONSTRAINT viewed_products_session_id_product_id_key
  UNIQUE (session_id, product_id);
