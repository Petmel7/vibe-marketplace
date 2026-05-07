-- Add new enum values to OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'refunded';

-- Add snapshot fields to order_items
ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "product_name_snapshot" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "variant_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "image_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "store_name_snapshot" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "unit_price_snapshot" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Remove defaults now that columns exist (they are only for adding to existing rows)
ALTER TABLE "order_items"
  ALTER COLUMN "product_name_snapshot" DROP DEFAULT,
  ALTER COLUMN "store_name_snapshot" DROP DEFAULT,
  ALTER COLUMN "unit_price_snapshot" DROP DEFAULT;

-- Add new fields to orders
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "shipping_address_id" UUID,
  ADD COLUMN IF NOT EXISTS "note" TEXT;

-- Add index on shipping_address_id
CREATE INDEX IF NOT EXISTS "orders_shippingAddressId_idx" ON "orders"("shipping_address_id");
