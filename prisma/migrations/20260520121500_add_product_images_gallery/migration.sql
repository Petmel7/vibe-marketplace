-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "alt_text" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_images_productId_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE INDEX "product_images_productId_position_idx" ON "product_images"("product_id", "position");

-- CreateIndex
CREATE INDEX "product_images_productId_isPrimary_idx" ON "product_images"("product_id", "is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "product_images_productId_single_primary_idx"
ON "product_images"("product_id")
WHERE "is_primary" = true;

-- AddForeignKey
ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
