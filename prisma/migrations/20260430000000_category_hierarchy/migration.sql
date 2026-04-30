ALTER TABLE "categories"
ADD COLUMN IF NOT EXISTS "parent_id" TEXT,
ADD COLUMN IF NOT EXISTS "icon" TEXT,
ADD COLUMN IF NOT EXISTS "hover_image" TEXT,
ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "is_visible" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "categories_parentId_idx" ON "categories"("parent_id");
CREATE INDEX IF NOT EXISTS "categories_order_idx" ON "categories"("sort_order");
CREATE INDEX IF NOT EXISTS "categories_parentId_order_idx" ON "categories"("parent_id", "sort_order");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_parent_id_fkey'
  ) THEN
    ALTER TABLE "categories"
    ADD CONSTRAINT "categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "categories"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_level_check'
  ) THEN
    ALTER TABLE "categories"
    ADD CONSTRAINT "categories_level_check"
    CHECK ("level" BETWEEN 1 AND 3);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_parent_not_self_check'
  ) THEN
    ALTER TABLE "categories"
    ADD CONSTRAINT "categories_parent_not_self_check"
    CHECK ("parent_id" IS NULL OR "parent_id" <> "id");
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "category_migration_logs" (
  "product_id" UUID NOT NULL,
  "old_category_slug" TEXT,
  "new_category_slug" TEXT NOT NULL,
  "match_strategy" TEXT NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "category_migration_logs_pkey" PRIMARY KEY ("product_id")
);

UPDATE "categories"
SET
  "name" = 'Одяг та взуття',
  "slug" = 'clothing-shoes',
  "parent_id" = NULL,
  "sort_order" = 0,
  "level" = 1,
  "is_active" = true,
  "is_visible" = true,
  "updated_at" = NOW()
WHERE "slug" = 'clothes'
  AND NOT EXISTS (
    SELECT 1
    FROM "categories"
    WHERE "slug" = 'clothing-shoes'
  );

WITH category_seed ("id", "parent_slug", "name", "slug", "sort_order") AS (
  VALUES
    ('cat-root-clothing-shoes', NULL, 'Одяг та взуття', 'clothing-shoes', 0),
    ('cat-root-accessories', NULL, 'Аксесуари', 'accessories', 1),
    ('cat-root-souvenirs', NULL, 'Сувеніри', 'souvenirs', 2),
    ('cat-root-stationery', NULL, 'Канцелярія', 'stationery', 3),

    ('cat-parent-womens-clothing', 'clothing-shoes', 'Жіночий одяг', 'womens-clothing', 0),
    ('cat-parent-mens-clothing', 'clothing-shoes', 'Чоловічий одяг', 'mens-clothing', 1),
    ('cat-parent-kids-clothing', 'clothing-shoes', 'Дитячий одяг', 'kids-clothing', 2),
    ('cat-parent-footwear', 'clothing-shoes', 'Взуття', 'footwear', 3),
    ('cat-parent-unisex-clothing', 'clothing-shoes', 'Унісекс одяг', 'unisex-clothing', 4),

    ('cat-parent-bags-backpacks', 'accessories', 'Сумки та рюкзаки', 'bags-backpacks', 0),
    ('cat-parent-jewelry-watches', 'accessories', 'Прикраси та годинники', 'jewelry-watches', 1),
    ('cat-parent-belts-wallets', 'accessories', 'Ремені та гаманці', 'belts-wallets', 2),
    ('cat-parent-headwear', 'accessories', 'Головні убори', 'headwear', 3),

    ('cat-parent-home-decor-souvenirs', 'souvenirs', 'Посуд та декор', 'home-decor-souvenirs', 0),
    ('cat-parent-gift-souvenirs', 'souvenirs', 'Пам''ятні дрібниці', 'gift-souvenirs', 1),

    ('cat-parent-writing-supplies', 'stationery', 'Для письма', 'writing-supplies', 0),
    ('cat-parent-paper-goods', 'stationery', 'Паперові товари', 'paper-goods', 1),
    ('cat-parent-office-supplies', 'stationery', 'Офісні товари', 'office-supplies', 2),

    ('cat-leaf-womens-dresses', 'womens-clothing', 'Жіночі сукні', 'womens-dresses', 0),
    ('cat-leaf-womens-outerwear', 'womens-clothing', 'Жіночий верхній одяг', 'womens-outerwear', 1),
    ('cat-leaf-womens-tops', 'womens-clothing', 'Жіночі футболки та топи', 'womens-tops', 2),
    ('cat-leaf-womens-bottoms', 'womens-clothing', 'Жіночі штани та спідниці', 'womens-bottoms', 3),
    ('cat-leaf-other-womens-clothing', 'womens-clothing', 'Інший жіночий одяг', 'other-womens-clothing', 4),

    ('cat-leaf-mens-tops', 'mens-clothing', 'Чоловічі футболки та сорочки', 'mens-tops', 0),
    ('cat-leaf-mens-hoodies-sweatshirts', 'mens-clothing', 'Чоловічі худі та світшоти', 'mens-hoodies-sweatshirts', 1),
    ('cat-leaf-mens-pants', 'mens-clothing', 'Чоловічі штани', 'mens-pants', 2),
    ('cat-leaf-mens-outerwear', 'mens-clothing', 'Чоловічий верхній одяг', 'mens-outerwear', 3),
    ('cat-leaf-other-mens-clothing', 'mens-clothing', 'Інший чоловічий одяг', 'other-mens-clothing', 4),

    ('cat-leaf-girls-clothing', 'kids-clothing', 'Одяг для дівчат', 'girls-clothing', 0),
    ('cat-leaf-boys-clothing', 'kids-clothing', 'Одяг для хлопців', 'boys-clothing', 1),
    ('cat-leaf-baby-clothing', 'kids-clothing', 'Одяг для немовлят', 'baby-clothing', 2),
    ('cat-leaf-other-kids-clothing', 'kids-clothing', 'Інший дитячий одяг', 'other-kids-clothing', 3),

    ('cat-leaf-womens-shoes', 'footwear', 'Жіноче взуття', 'womens-shoes', 0),
    ('cat-leaf-mens-shoes', 'footwear', 'Чоловіче взуття', 'mens-shoes', 1),
    ('cat-leaf-kids-shoes', 'footwear', 'Дитяче взуття', 'kids-shoes', 2),
    ('cat-leaf-other-footwear', 'footwear', 'Інше взуття', 'other-footwear', 3),

    ('cat-leaf-other-unisex-clothing', 'unisex-clothing', 'Інший унісекс одяг', 'other-unisex-clothing', 0),

    ('cat-leaf-womens-bags', 'bags-backpacks', 'Жіночі сумки', 'womens-bags', 0),
    ('cat-leaf-mens-bags', 'bags-backpacks', 'Чоловічі сумки', 'mens-bags', 1),
    ('cat-leaf-backpacks', 'bags-backpacks', 'Рюкзаки', 'backpacks', 2),
    ('cat-leaf-other-bags', 'bags-backpacks', 'Інші сумки', 'other-bags', 3),

    ('cat-leaf-jewelry', 'jewelry-watches', 'Прикраси', 'jewelry', 0),
    ('cat-leaf-watches', 'jewelry-watches', 'Годинники', 'watches', 1),
    ('cat-leaf-other-jewelry-watches', 'jewelry-watches', 'Інші прикраси та годинники', 'other-jewelry-watches', 2),

    ('cat-leaf-belts', 'belts-wallets', 'Ремені', 'belts', 0),
    ('cat-leaf-wallets', 'belts-wallets', 'Гаманці', 'wallets', 1),
    ('cat-leaf-other-wear-accessories', 'belts-wallets', 'Інші аксесуари для носіння', 'other-wear-accessories', 2),

    ('cat-leaf-caps-baseball-caps', 'headwear', 'Кепки та бейсболки', 'caps-baseball-caps', 0),
    ('cat-leaf-winter-hats', 'headwear', 'Шапки', 'winter-hats', 1),
    ('cat-leaf-other-headwear', 'headwear', 'Інші головні убори', 'other-headwear', 2),

    ('cat-leaf-mugs-tumblers', 'home-decor-souvenirs', 'Чашки та термочашки', 'mugs-tumblers', 0),
    ('cat-leaf-posters-art', 'home-decor-souvenirs', 'Постери та картини', 'posters-art', 1),
    ('cat-leaf-magnets-decor', 'home-decor-souvenirs', 'Магніти та декор', 'magnets-decor', 2),
    ('cat-leaf-other-home-decor-souvenirs', 'home-decor-souvenirs', 'Інший декор', 'other-home-decor-souvenirs', 3),

    ('cat-leaf-keychains', 'gift-souvenirs', 'Брелоки', 'keychains', 0),
    ('cat-leaf-stickers', 'gift-souvenirs', 'Наліпки', 'stickers', 1),
    ('cat-leaf-pins-badges', 'gift-souvenirs', 'Значки', 'pins-badges', 2),
    ('cat-leaf-other-gift-souvenirs', 'gift-souvenirs', 'Інші сувеніри', 'other-gift-souvenirs', 3),

    ('cat-leaf-pens-pencils', 'writing-supplies', 'Ручки та олівці', 'pens-pencils', 0),
    ('cat-leaf-markers-highlighters', 'writing-supplies', 'Маркери', 'markers-highlighters', 1),
    ('cat-leaf-other-writing-supplies', 'writing-supplies', 'Інше для письма', 'other-writing-supplies', 2),

    ('cat-leaf-notebooks', 'paper-goods', 'Зошити', 'notebooks', 0),
    ('cat-leaf-notepads', 'paper-goods', 'Блокноти', 'notepads', 1),
    ('cat-leaf-planners', 'paper-goods', 'Щоденники', 'planners', 2),
    ('cat-leaf-other-paper-goods', 'paper-goods', 'Інші паперові товари', 'other-paper-goods', 3),

    ('cat-leaf-folders-organizers', 'office-supplies', 'Папки та органайзери', 'folders-organizers', 0),
    ('cat-leaf-desk-accessories', 'office-supplies', 'Настільні аксесуари', 'desk-accessories', 1),
    ('cat-leaf-other-office-supplies', 'office-supplies', 'Інша канцелярія', 'other-office-supplies', 2)
)
INSERT INTO "categories" (
  "id",
  "parent_id",
  "name",
  "slug",
  "image_url",
  "icon",
  "hover_image",
  "sort_order",
  "level",
  "is_active",
  "is_visible",
  "created_at",
  "updated_at"
)
SELECT
  seed."id",
  parent."id",
  seed."name",
  seed."slug",
  NULL,
  NULL,
  NULL,
  seed."sort_order",
  COALESCE(parent."level", 0) + 1,
  true,
  true,
  NOW(),
  NOW()
FROM category_seed AS seed
LEFT JOIN "categories" AS parent
  ON parent."slug" = seed."parent_slug"
ON CONFLICT ("slug") DO UPDATE
SET
  "parent_id" = EXCLUDED."parent_id",
  "name" = EXCLUDED."name",
  "sort_order" = EXCLUDED."sort_order",
  "level" = EXCLUDED."level",
  "is_active" = EXCLUDED."is_active",
  "is_visible" = EXCLUDED."is_visible",
  "updated_at" = NOW();

CREATE OR REPLACE FUNCTION detect_category_root(
  current_slug TEXT,
  product_name TEXT,
  product_sku TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  haystack TEXT := lower(coalesce(product_name, '') || ' ' || coalesce(product_sku, ''));
BEGIN
  IF current_slug IN ('clothing-shoes', 'accessories', 'souvenirs', 'stationery') THEN
    RETURN current_slug;
  END IF;

  IF haystack ~ '(рюкзак|сумк|bag|backpack|рем(е|і)н|belt|гаман|wallet|кепк|бейсболк|шапк|cap|hat|годин|watch|прикрас|сереж|каблуч|браслет|chain|окуляр|scarf)' THEN
    RETURN 'accessories';
  END IF;

  IF haystack ~ '(сувен|чашк|термочаш|mug|tumbler|постер|poster|sticker|стікер|наліпк|брелок|keychain|магніт|magnet|значок|badge)' THEN
    RETURN 'souvenirs';
  END IF;

  IF haystack ~ '(ручк|олів|pen|pencil|marker|маркер|зошит|notebook|блокнот|notepad|щоден|planner|папк|folder|органайзер|organizer|канцел)' THEN
    RETURN 'stationery';
  END IF;

  RETURN 'clothing-shoes';
END
$$;

CREATE OR REPLACE FUNCTION detect_category_leaf(
  root_slug TEXT,
  product_name TEXT,
  product_sku TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  haystack TEXT := lower(coalesce(product_name, '') || ' ' || coalesce(product_sku, ''));
  is_womens BOOLEAN := haystack ~ '(жін|жіноч|дівч|female|women|woman|lady)';
  is_mens BOOLEAN := haystack ~ '(чоловіч|чолов|male|men|man)';
  is_kids BOOLEAN := haystack ~ '(дит|kids|kid|child|teen|підліт)';
  is_baby BOOLEAN := haystack ~ '(немов|малюк|baby|infant)';
  is_girls BOOLEAN := haystack ~ '(дівчат|girl)';
  is_boys BOOLEAN := haystack ~ '(хлопц|boy)';
BEGIN
  IF root_slug = 'clothing-shoes' THEN
    IF haystack ~ '(взут|кросів|кед|черев|чоб|туфл|ботин|сандал|shoe|sneaker|boot|loafer|slipper)' THEN
      IF is_kids OR is_baby OR is_girls OR is_boys THEN
        RETURN 'kids-shoes';
      ELSIF is_mens THEN
        RETURN 'mens-shoes';
      ELSIF is_womens THEN
        RETURN 'womens-shoes';
      END IF;

      RETURN 'other-footwear';
    END IF;

    IF is_baby THEN
      RETURN 'baby-clothing';
    END IF;

    IF is_girls THEN
      RETURN 'girls-clothing';
    END IF;

    IF is_boys THEN
      RETURN 'boys-clothing';
    END IF;

    IF is_kids THEN
      RETURN 'other-kids-clothing';
    END IF;

    IF is_womens THEN
      IF haystack ~ '(сукн|dress)' THEN
        RETURN 'womens-dresses';
      ELSIF haystack ~ '(куртк|пальт|пухов|ветров|жакет|coat|jacket|outerwear)' THEN
        RETURN 'womens-outerwear';
      ELSIF haystack ~ '(футбол|топ|майк|блуз|сороч|tee|t-shirt|shirt|top)' THEN
        RETURN 'womens-tops';
      ELSIF haystack ~ '(штани|спідниц|джинс|легінс|pants|jeans|skirt|trousers)' THEN
        RETURN 'womens-bottoms';
      END IF;

      RETURN 'other-womens-clothing';
    END IF;

    IF is_mens THEN
      IF haystack ~ '(худі|світшот|hoodie|sweatshirt)' THEN
        RETURN 'mens-hoodies-sweatshirts';
      ELSIF haystack ~ '(куртк|пальт|пухов|ветров|jacket|coat|outerwear)' THEN
        RETURN 'mens-outerwear';
      ELSIF haystack ~ '(штани|джинс|брюк|pants|jeans|trousers)' THEN
        RETURN 'mens-pants';
      ELSIF haystack ~ '(футбол|сороч|поло|tee|t-shirt|shirt|polo)' THEN
        RETURN 'mens-tops';
      END IF;

      RETURN 'other-mens-clothing';
    END IF;

    RETURN 'other-unisex-clothing';
  END IF;

  IF root_slug = 'accessories' THEN
    IF haystack ~ '(рюкзак|backpack)' THEN
      RETURN 'backpacks';
    ELSIF haystack ~ '(сумк|bag)' THEN
      IF is_mens THEN
        RETURN 'mens-bags';
      ELSIF is_womens THEN
        RETURN 'womens-bags';
      END IF;

      RETURN 'other-bags';
    ELSIF haystack ~ '(годин|watch)' THEN
      RETURN 'watches';
    ELSIF haystack ~ '(прикрас|сереж|намист|підвіск|каблуч|браслет|jewelry|ring|necklace|bracelet)' THEN
      RETURN 'jewelry';
    ELSIF haystack ~ '(рем(е|і)н|belt)' THEN
      RETURN 'belts';
    ELSIF haystack ~ '(гаман|wallet)' THEN
      RETURN 'wallets';
    ELSIF haystack ~ '(кепк|бейсболк|cap)' THEN
      RETURN 'caps-baseball-caps';
    ELSIF haystack ~ '(шапк|hat|beanie)' THEN
      RETURN 'winter-hats';
    END IF;

    RETURN 'other-wear-accessories';
  END IF;

  IF root_slug = 'souvenirs' THEN
    IF haystack ~ '(чашк|термочаш|mug|tumbler)' THEN
      RETURN 'mugs-tumblers';
    ELSIF haystack ~ '(постер|poster|картин|print)' THEN
      RETURN 'posters-art';
    ELSIF haystack ~ '(магніт|magnet|декор|figurine)' THEN
      RETURN 'magnets-decor';
    ELSIF haystack ~ '(брелок|keychain)' THEN
      RETURN 'keychains';
    ELSIF haystack ~ '(стікер|sticker|наліпк)' THEN
      RETURN 'stickers';
    ELSIF haystack ~ '(значок|badge|pin)' THEN
      RETURN 'pins-badges';
    END IF;

    RETURN 'other-gift-souvenirs';
  END IF;

  IF root_slug = 'stationery' THEN
    IF haystack ~ '(ручк|олів|pen|pencil)' THEN
      RETURN 'pens-pencils';
    ELSIF haystack ~ '(маркер|marker|highlight)' THEN
      RETURN 'markers-highlighters';
    ELSIF haystack ~ '(зошит|notebook)' THEN
      RETURN 'notebooks';
    ELSIF haystack ~ '(блокнот|notepad)' THEN
      RETURN 'notepads';
    ELSIF haystack ~ '(щоден|planner|diary)' THEN
      RETURN 'planners';
    ELSIF haystack ~ '(папк|folder|органайзер|organizer)' THEN
      RETURN 'folders-organizers';
    ELSIF haystack ~ '(настільн|desk)' THEN
      RETURN 'desk-accessories';
    END IF;

    RETURN 'other-office-supplies';
  END IF;

  RETURN 'other-unisex-clothing';
END
$$;

WITH candidates AS (
  SELECT
    p."id" AS "product_id",
    current_category."slug" AS "old_category_slug",
    detect_category_root(current_category."slug", p."name", p."sku") AS "root_slug",
    detect_category_leaf(
      detect_category_root(current_category."slug", p."name", p."sku"),
      p."name",
      p."sku"
    ) AS "new_category_slug"
  FROM "products" AS p
  LEFT JOIN "categories" AS current_category
    ON current_category."id" = p."category_id"
  WHERE p."category_id" IS NULL
     OR EXISTS (
       SELECT 1
       FROM "categories" AS child
       WHERE child."parent_id" = p."category_id"
     )
)
INSERT INTO "category_migration_logs" (
  "product_id",
  "old_category_slug",
  "new_category_slug",
  "match_strategy",
  "note",
  "created_at",
  "updated_at"
)
SELECT
  candidates."product_id",
  candidates."old_category_slug",
  candidates."new_category_slug",
  CASE
    WHEN candidates."new_category_slug" LIKE 'other-%' THEN 'fallback'
    WHEN candidates."old_category_slug" = candidates."root_slug" THEN 'legacy-category'
    ELSE 'keyword'
  END,
  'Assigned during category hierarchy migration',
  NOW(),
  NOW()
FROM candidates
ON CONFLICT ("product_id") DO UPDATE
SET
  "old_category_slug" = EXCLUDED."old_category_slug",
  "new_category_slug" = EXCLUDED."new_category_slug",
  "match_strategy" = EXCLUDED."match_strategy",
  "note" = EXCLUDED."note",
  "updated_at" = NOW();

WITH candidates AS (
  SELECT
    p."id" AS "product_id",
    detect_category_leaf(
      detect_category_root(current_category."slug", p."name", p."sku"),
      p."name",
      p."sku"
    ) AS "new_category_slug"
  FROM "products" AS p
  LEFT JOIN "categories" AS current_category
    ON current_category."id" = p."category_id"
  WHERE p."category_id" IS NULL
     OR EXISTS (
       SELECT 1
       FROM "categories" AS child
       WHERE child."parent_id" = p."category_id"
     )
)
UPDATE "products" AS p
SET "category_id" = leaf."id"
FROM candidates
JOIN "categories" AS leaf
  ON leaf."slug" = candidates."new_category_slug"
WHERE p."id" = candidates."product_id"
  AND p."category_id" IS DISTINCT FROM leaf."id";

DELETE FROM "categories"
WHERE "slug" = 'clothes'
  AND NOT EXISTS (
    SELECT 1
    FROM "products"
    WHERE "category_id" = "categories"."id"
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "products"
    WHERE "category_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Category hierarchy migration left products without a category assignment';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "products" AS p
    WHERE EXISTS (
      SELECT 1
      FROM "categories" AS child
      WHERE child."parent_id" = p."category_id"
    )
  ) THEN
    RAISE EXCEPTION 'Category hierarchy migration left products assigned to non-leaf categories';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION enforce_category_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  parent_level INTEGER;
BEGIN
  IF NEW."parent_id" IS NULL THEN
    NEW."level" := 1;
    RETURN NEW;
  END IF;

  IF NEW."parent_id" = NEW."id" THEN
    RAISE EXCEPTION 'Category cannot be its own parent';
  END IF;

  WITH RECURSIVE ancestor_chain AS (
    SELECT c."id", c."parent_id"
    FROM "categories" AS c
    WHERE c."id" = NEW."parent_id"

    UNION ALL

    SELECT c."id", c."parent_id"
    FROM "categories" AS c
    JOIN ancestor_chain AS chain
      ON c."id" = chain."parent_id"
  )
  SELECT 1
  FROM ancestor_chain
  WHERE "id" = NEW."id"
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Category hierarchy cycle detected';
  END IF;

  SELECT "level"
  INTO parent_level
  FROM "categories"
  WHERE "id" = NEW."parent_id";

  IF parent_level IS NULL THEN
    RAISE EXCEPTION 'Parent category % does not exist', NEW."parent_id";
  END IF;

  NEW."level" := parent_level + 1;

  IF NEW."level" > 3 THEN
    RAISE EXCEPTION 'Category depth exceeds the maximum of 3 levels';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "products"
    WHERE "category_id" = NEW."parent_id"
  ) THEN
    RAISE EXCEPTION 'Cannot attach child categories to a category that already has products';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS "categories_enforce_hierarchy_trigger" ON "categories";

CREATE TRIGGER "categories_enforce_hierarchy_trigger"
BEFORE INSERT OR UPDATE OF "parent_id"
ON "categories"
FOR EACH ROW
EXECUTE FUNCTION enforce_category_hierarchy();

CREATE OR REPLACE FUNCTION enforce_product_leaf_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."category_id" IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "categories"
    WHERE "parent_id" = NEW."category_id"
  ) THEN
    RAISE EXCEPTION 'Products may only be assigned to leaf categories';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS "products_enforce_leaf_category_trigger" ON "products";

CREATE TRIGGER "products_enforce_leaf_category_trigger"
BEFORE INSERT OR UPDATE OF "category_id"
ON "products"
FOR EACH ROW
EXECUTE FUNCTION enforce_product_leaf_category();

DROP FUNCTION IF EXISTS detect_category_root(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS detect_category_leaf(TEXT, TEXT, TEXT);
