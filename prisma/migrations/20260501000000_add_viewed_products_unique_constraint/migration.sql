-- Deduplicate any existing rows before creating unique indexes.
-- For session-based rows: keep the most-recent row per (session_id, product_id).
DELETE FROM viewed_products a
USING viewed_products b
WHERE a.id > b.id
  AND a.session_id = b.session_id
  AND a.product_id = b.product_id;

-- For user-based rows: keep the most-recent row per (user_id, product_id).
DELETE FROM viewed_products a
USING viewed_products b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.product_id = b.product_id;

-- Partial unique index for session-based views.
-- Matches the ON CONFLICT (session_id, product_id) WHERE session_id IS NOT NULL clause.
CREATE UNIQUE INDEX IF NOT EXISTS idx_viewed_session_product
  ON viewed_products (session_id, product_id)
  WHERE session_id IS NOT NULL;

-- Partial unique index for user-based views.
-- Matches the ON CONFLICT (user_id, product_id) WHERE user_id IS NOT NULL clause.
CREATE UNIQUE INDEX IF NOT EXISTS idx_viewed_user_product
  ON viewed_products (user_id, product_id)
  WHERE user_id IS NOT NULL;
