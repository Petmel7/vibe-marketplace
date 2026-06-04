-- CreateEnum
CREATE TYPE "public"."RefundRequestReason" AS ENUM (
  'ITEM_NOT_RECEIVED',
  'ITEM_NOT_AS_DESCRIBED',
  'DAMAGED_ITEM',
  'WRONG_ITEM',
  'PAYMENT_ISSUE',
  'BUYER_CHANGED_MIND',
  'SELLER_CANCELLED',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "public"."RefundRequestStatus" AS ENUM (
  'REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

-- CreateEnum
CREATE TYPE "public"."RefundActionType" AS ENUM (
  'CREATED',
  'STATUS_CHANGED',
  'APPROVED',
  'REJECTED',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'ADMIN_NOTE'
);

-- AlterTable
ALTER TABLE "public"."refunds"
ADD COLUMN "refund_request_id" UUID;

-- CreateTable
CREATE TABLE "public"."refund_requests" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "order_item_id" UUID,
  "payment_id" UUID NOT NULL,
  "requested_by_id" UUID NOT NULL,
  "reason" "public"."RefundRequestReason" NOT NULL,
  "status" "public"."RefundRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "description" TEXT,
  "admin_note" TEXT,
  "resolved_by_id" UUID,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refund_actions" (
  "id" UUID NOT NULL,
  "refund_request_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "action_type" "public"."RefundActionType" NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "refund_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refunds_refund_request_id_idx"
ON "public"."refunds"("refund_request_id");

-- CreateIndex
CREATE INDEX "refund_requests_order_id_idx"
ON "public"."refund_requests"("order_id");

-- CreateIndex
CREATE INDEX "refund_requests_order_item_id_idx"
ON "public"."refund_requests"("order_item_id");

-- CreateIndex
CREATE INDEX "refund_requests_payment_id_idx"
ON "public"."refund_requests"("payment_id");

-- CreateIndex
CREATE INDEX "refund_requests_requested_by_id_idx"
ON "public"."refund_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "refund_requests_status_idx"
ON "public"."refund_requests"("status");

-- CreateIndex
CREATE INDEX "refund_requests_reason_idx"
ON "public"."refund_requests"("reason");

-- CreateIndex
CREATE INDEX "refund_requests_resolved_by_id_idx"
ON "public"."refund_requests"("resolved_by_id");

-- CreateIndex
CREATE INDEX "refund_requests_created_at_idx"
ON "public"."refund_requests"("created_at");

-- Prevent duplicate active item-level refund requests while still allowing historical rows
CREATE UNIQUE INDEX "refund_requests_active_order_item_idx"
ON "public"."refund_requests"("order_item_id")
WHERE "order_item_id" IS NOT NULL
  AND "status" IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING');

-- CreateIndex
CREATE INDEX "refund_actions_refund_request_id_idx"
ON "public"."refund_actions"("refund_request_id");

-- CreateIndex
CREATE INDEX "refund_actions_actor_id_idx"
ON "public"."refund_actions"("actor_id");

-- CreateIndex
CREATE INDEX "refund_actions_created_at_idx"
ON "public"."refund_actions"("created_at");

-- AddForeignKey
ALTER TABLE "public"."refunds"
  ADD CONSTRAINT "refunds_refund_request_id_fkey"
  FOREIGN KEY ("refund_request_id") REFERENCES "public"."refund_requests"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refund_requests"
  ADD CONSTRAINT "refund_requests_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refund_requests"
  ADD CONSTRAINT "refund_requests_order_item_id_fkey"
  FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refund_requests"
  ADD CONSTRAINT "refund_requests_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refund_requests"
  ADD CONSTRAINT "refund_requests_requested_by_id_fkey"
  FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refund_requests"
  ADD CONSTRAINT "refund_requests_resolved_by_id_fkey"
  FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refund_actions"
  ADD CONSTRAINT "refund_actions_refund_request_id_fkey"
  FOREIGN KEY ("refund_request_id") REFERENCES "public"."refund_requests"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refund_actions"
  ADD CONSTRAINT "refund_actions_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
