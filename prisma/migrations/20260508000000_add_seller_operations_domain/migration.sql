-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ItemFulfillmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED');

-- AlterTable stores: add banner_url column
ALTER TABLE "stores" ADD COLUMN "banner_url" TEXT;

-- AlterTable products: add status, rejection_reason, published_at columns
ALTER TABLE "products" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "products" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "products" ADD COLUMN "published_at" TIMESTAMP(3);

-- AlterTable order_items: add fulfillment_status column
ALTER TABLE "order_items" ADD COLUMN "fulfillment_status" "ItemFulfillmentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "order_items_fulfillmentStatus_idx" ON "order_items"("fulfillment_status");
