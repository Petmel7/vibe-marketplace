-- Extend shipments with courier delivery snapshots and return-shipment linkage.
ALTER TABLE "public"."shipments"
ADD COLUMN "original_shipment_id" UUID,
ADD COLUMN "is_return_shipment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "recipient_street" TEXT,
ADD COLUMN "recipient_building" TEXT,
ADD COLUMN "recipient_apartment" TEXT;

ALTER TABLE "public"."shipments"
ADD CONSTRAINT "shipments_original_shipment_id_fkey"
FOREIGN KEY ("original_shipment_id") REFERENCES "public"."shipments"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "shipments_original_shipment_id_idx"
ON "public"."shipments"("original_shipment_id");

CREATE INDEX "shipments_is_return_shipment_idx"
ON "public"."shipments"("is_return_shipment");
