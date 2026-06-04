-- CreateEnum
CREATE TYPE "ShippingProvider" AS ENUM ('NOVA_POSHTA', 'MANUAL');

-- CreateEnum
CREATE TYPE "ShippingDeliveryType" AS ENUM ('NOVA_POSHTA_WAREHOUSE', 'NOVA_POSHTA_COURIER');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM (
  'PENDING',
  'READY_TO_SHIP',
  'LABEL_CREATED',
  'SHIPPED',
  'IN_TRANSIT',
  'ARRIVED',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
  'RETURNED'
);

-- CreateTable
CREATE TABLE "store_shipping_settings" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "provider" "ShippingProvider" NOT NULL,
    "sender_name" TEXT NOT NULL,
    "sender_phone" TEXT NOT NULL,
    "sender_city_ref" TEXT NOT NULL,
    "sender_city_name" TEXT NOT NULL,
    "sender_warehouse_ref" TEXT,
    "sender_warehouse_name" TEXT,
    "is_configured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_shipping_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "provider" "ShippingProvider" NOT NULL,
    "delivery_type" "ShippingDeliveryType" NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "recipient_name" TEXT NOT NULL,
    "recipient_phone" TEXT NOT NULL,
    "recipient_city_ref" TEXT NOT NULL,
    "recipient_city_name" TEXT NOT NULL,
    "recipient_warehouse_ref" TEXT,
    "recipient_warehouse_name" TEXT,
    "estimated_cost" DECIMAL(10,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'UAH',
    "tracking_number" TEXT,
    "provider_shipment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_items" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_shipping_settings_store_id_key" ON "store_shipping_settings"("store_id");

-- CreateIndex
CREATE INDEX "store_shipping_settings_store_id_idx" ON "store_shipping_settings"("store_id");

-- CreateIndex
CREATE INDEX "shipments_order_id_idx" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_store_id_idx" ON "shipments"("store_id");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "shipments_provider_idx" ON "shipments"("provider");

-- CreateIndex
CREATE INDEX "shipments_tracking_number_idx" ON "shipments"("tracking_number");

-- CreateIndex
CREATE INDEX "shipment_items_shipment_id_idx" ON "shipment_items"("shipment_id");

-- CreateIndex
CREATE INDEX "shipment_items_order_item_id_idx" ON "shipment_items"("order_item_id");

-- AddForeignKey
ALTER TABLE "store_shipping_settings" ADD CONSTRAINT "store_shipping_settings_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_fkey"
FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_order_item_id_fkey"
FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
