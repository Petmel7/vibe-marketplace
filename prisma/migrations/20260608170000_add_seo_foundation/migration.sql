CREATE TYPE "SeoEntityType" AS ENUM ('GLOBAL', 'PRODUCT', 'CATEGORY', 'STORE', 'PAGE');

ALTER TABLE "stores"
ADD COLUMN "seo_title" TEXT,
ADD COLUMN "seo_description" TEXT;

ALTER TABLE "categories"
ADD COLUMN "seo_title" TEXT,
ADD COLUMN "seo_description" TEXT,
ADD COLUMN "seo_text" TEXT;

CREATE TABLE "seo_metadata" (
    "id" UUID NOT NULL,
    "entity_type" "SeoEntityType" NOT NULL,
    "entity_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT,
    "canonical_url" TEXT,
    "og_title" TEXT,
    "og_description" TEXT,
    "og_image_url" TEXT,
    "no_index" BOOLEAN NOT NULL DEFAULT false,
    "no_follow" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_metadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seo_metadata_entity_type_entity_id_key" ON "seo_metadata"("entity_type", "entity_id");
CREATE INDEX "seo_metadata_entity_type_idx" ON "seo_metadata"("entity_type");
CREATE INDEX "seo_metadata_entity_id_idx" ON "seo_metadata"("entity_id");
CREATE INDEX "seo_metadata_no_index_idx" ON "seo_metadata"("no_index");
