-- CreateEnum
CREATE TYPE "HeroBannerStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "HeroBannerDestinationType" AS ENUM ('NONE', 'CATEGORY', 'PRODUCT', 'STORE', 'PROMOTION', 'SEARCH', 'CUSTOM_URL');

-- CreateTable
CREATE TABLE "hero_banners" (
    "id" UUID NOT NULL,
    "eyebrow" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "desktop_image_url" TEXT,
    "desktop_image_storage_path" TEXT,
    "tablet_image_url" TEXT,
    "tablet_image_storage_path" TEXT,
    "mobile_image_url" TEXT,
    "mobile_image_storage_path" TEXT,
    "image_alt" TEXT,
    "background_color" TEXT,
    "text_color" TEXT,
    "overlay_opacity" DECIMAL(3,2) NOT NULL DEFAULT 0.35,
    "cta_text" TEXT,
    "destination_type" "HeroBannerDestinationType" NOT NULL DEFAULT 'NONE',
    "category_id" TEXT,
    "product_id" UUID,
    "store_id" UUID,
    "promotion_id" UUID,
    "search_query" TEXT,
    "custom_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "HeroBannerStatus" NOT NULL DEFAULT 'DRAFT',
    "autoplay" BOOLEAN NOT NULL DEFAULT false,
    "autoplay_delay" INTEGER,
    "open_in_new_tab" BOOLEAN NOT NULL DEFAULT false,
    "publish_start_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publish_end_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hero_banners_status_sort_order_idx" ON "hero_banners"("status", "sort_order");

-- CreateIndex
CREATE INDEX "hero_banners_publish_window_idx" ON "hero_banners"("publish_start_at", "publish_end_at");

-- CreateIndex
CREATE INDEX "hero_banners_destination_type_idx" ON "hero_banners"("destination_type");

-- CreateIndex
CREATE INDEX "hero_banners_category_id_idx" ON "hero_banners"("category_id");

-- CreateIndex
CREATE INDEX "hero_banners_product_id_idx" ON "hero_banners"("product_id");

-- CreateIndex
CREATE INDEX "hero_banners_store_id_idx" ON "hero_banners"("store_id");

-- CreateIndex
CREATE INDEX "hero_banners_promotion_id_idx" ON "hero_banners"("promotion_id");

-- CreateIndex
CREATE INDEX "hero_banners_created_by_id_idx" ON "hero_banners"("created_by_id");

-- CreateIndex
CREATE INDEX "hero_banners_updated_by_id_idx" ON "hero_banners"("updated_by_id");

-- AddForeignKey
ALTER TABLE "hero_banners" ADD CONSTRAINT "hero_banners_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hero_banners" ADD CONSTRAINT "hero_banners_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hero_banners" ADD CONSTRAINT "hero_banners_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hero_banners" ADD CONSTRAINT "hero_banners_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hero_banners" ADD CONSTRAINT "hero_banners_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hero_banners" ADD CONSTRAINT "hero_banners_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "hero_banners"
ADD CONSTRAINT "hero_banners_publish_window_check"
CHECK ("publish_end_at" IS NULL OR "publish_end_at" > "publish_start_at");

-- AddCheckConstraint
ALTER TABLE "hero_banners"
ADD CONSTRAINT "hero_banners_sort_order_check"
CHECK ("sort_order" >= 0);

-- AddCheckConstraint
ALTER TABLE "hero_banners"
ADD CONSTRAINT "hero_banners_overlay_opacity_check"
CHECK ("overlay_opacity" >= 0 AND "overlay_opacity" <= 1);

-- AddCheckConstraint
ALTER TABLE "hero_banners"
ADD CONSTRAINT "hero_banners_autoplay_delay_check"
CHECK (
    ("autoplay" = false AND "autoplay_delay" IS NULL)
    OR ("autoplay" = true AND "autoplay_delay" BETWEEN 1000 AND 60000)
);

-- AddCheckConstraint
ALTER TABLE "hero_banners"
ADD CONSTRAINT "hero_banners_color_format_check"
CHECK (
    ("background_color" IS NULL OR "background_color" ~ '^#[0-9A-Fa-f]{6}$')
    AND ("text_color" IS NULL OR "text_color" ~ '^#[0-9A-Fa-f]{6}$')
);

-- AddCheckConstraint
ALTER TABLE "hero_banners"
ADD CONSTRAINT "hero_banners_custom_url_internal_check"
CHECK ("custom_url" IS NULL OR ("custom_url" LIKE '/%' AND "custom_url" NOT LIKE '//%'));

-- AddCheckConstraint
ALTER TABLE "hero_banners"
ADD CONSTRAINT "hero_banners_destination_consistency_check"
CHECK (
    (
      "destination_type" = 'NONE'
      AND "category_id" IS NULL
      AND "product_id" IS NULL
      AND "store_id" IS NULL
      AND "promotion_id" IS NULL
      AND "search_query" IS NULL
      AND "custom_url" IS NULL
      AND "cta_text" IS NULL
      AND "open_in_new_tab" = false
    )
    OR (
      "destination_type" = 'CATEGORY'
      AND "category_id" IS NOT NULL
      AND "product_id" IS NULL
      AND "store_id" IS NULL
      AND "promotion_id" IS NULL
      AND "search_query" IS NULL
      AND "custom_url" IS NULL
      AND "cta_text" IS NOT NULL
      AND "open_in_new_tab" = false
    )
    OR (
      "destination_type" = 'PRODUCT'
      AND "category_id" IS NULL
      AND "product_id" IS NOT NULL
      AND "store_id" IS NULL
      AND "promotion_id" IS NULL
      AND "search_query" IS NULL
      AND "custom_url" IS NULL
      AND "cta_text" IS NOT NULL
      AND "open_in_new_tab" = false
    )
    OR (
      "destination_type" = 'STORE'
      AND "category_id" IS NULL
      AND "product_id" IS NULL
      AND "store_id" IS NOT NULL
      AND "promotion_id" IS NULL
      AND "search_query" IS NULL
      AND "custom_url" IS NULL
      AND "cta_text" IS NOT NULL
      AND "open_in_new_tab" = false
    )
    OR (
      "destination_type" = 'PROMOTION'
      AND "category_id" IS NULL
      AND "product_id" IS NULL
      AND "store_id" IS NULL
      AND "promotion_id" IS NOT NULL
      AND "search_query" IS NULL
      AND "custom_url" IS NULL
      AND "cta_text" IS NOT NULL
      AND "open_in_new_tab" = false
    )
    OR (
      "destination_type" = 'SEARCH'
      AND "category_id" IS NULL
      AND "product_id" IS NULL
      AND "store_id" IS NULL
      AND "promotion_id" IS NULL
      AND "search_query" IS NOT NULL
      AND "custom_url" IS NULL
      AND "cta_text" IS NOT NULL
      AND "open_in_new_tab" = false
    )
    OR (
      "destination_type" = 'CUSTOM_URL'
      AND "category_id" IS NULL
      AND "product_id" IS NULL
      AND "store_id" IS NULL
      AND "promotion_id" IS NULL
      AND "search_query" IS NULL
      AND "custom_url" IS NOT NULL
      AND "cta_text" IS NOT NULL
    )
);

-- AddCheckConstraint
ALTER TABLE "hero_banners"
ADD CONSTRAINT "hero_banners_published_content_check"
CHECK (
    "status" <> 'PUBLISHED'
    OR (
      btrim("title") <> ''
      AND "desktop_image_url" IS NOT NULL
      AND btrim("desktop_image_url") <> ''
      AND "image_alt" IS NOT NULL
      AND btrim("image_alt") <> ''
    )
);
