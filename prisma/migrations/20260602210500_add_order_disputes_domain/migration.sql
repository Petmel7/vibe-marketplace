-- CreateEnum
CREATE TYPE "public"."DisputeReason" AS ENUM (
    'ITEM_NOT_RECEIVED',
    'ITEM_NOT_AS_DESCRIBED',
    'DAMAGED_ITEM',
    'WRONG_ITEM',
    'PAYMENT_ISSUE',
    'REFUND_REQUEST',
    'SELLER_ISSUE',
    'BUYER_ISSUE',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "public"."DisputeStatus" AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'WAITING_BUYER',
    'WAITING_SELLER',
    'RESOLVED',
    'REJECTED',
    'ESCALATED',
    'CLOSED'
);

-- CreateEnum
CREATE TYPE "public"."DisputePriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);

-- CreateTable
CREATE TABLE "public"."disputes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "order_item_id" UUID,
    "opened_by_id" UUID NOT NULL,
    "respondent_id" UUID,
    "store_id" UUID,
    "reason" "public"."DisputeReason" NOT NULL,
    "status" "public"."DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "public"."DisputePriority" NOT NULL DEFAULT 'NORMAL',
    "description" TEXT NOT NULL,
    "resolution_note" TEXT,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dispute_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dispute_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dispute_evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dispute_id" UUID NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "disputes_order_id_idx"
ON "public"."disputes"("order_id");

-- CreateIndex
CREATE INDEX "disputes_order_item_id_idx"
ON "public"."disputes"("order_item_id");

-- CreateIndex
CREATE INDEX "disputes_opened_by_id_idx"
ON "public"."disputes"("opened_by_id");

-- CreateIndex
CREATE INDEX "disputes_respondent_id_idx"
ON "public"."disputes"("respondent_id");

-- CreateIndex
CREATE INDEX "disputes_store_id_idx"
ON "public"."disputes"("store_id");

-- CreateIndex
CREATE INDEX "disputes_resolved_by_id_idx"
ON "public"."disputes"("resolved_by_id");

-- CreateIndex
CREATE INDEX "disputes_status_idx"
ON "public"."disputes"("status");

-- CreateIndex
CREATE INDEX "disputes_reason_idx"
ON "public"."disputes"("reason");

-- CreateIndex
CREATE INDEX "disputes_priority_idx"
ON "public"."disputes"("priority");

-- CreateIndex
CREATE INDEX "disputes_created_at_idx"
ON "public"."disputes"("created_at");

-- CreateIndex
CREATE INDEX "dispute_messages_dispute_id_idx"
ON "public"."dispute_messages"("dispute_id");

-- CreateIndex
CREATE INDEX "dispute_messages_sender_id_idx"
ON "public"."dispute_messages"("sender_id");

-- CreateIndex
CREATE INDEX "dispute_messages_created_at_idx"
ON "public"."dispute_messages"("created_at");

-- CreateIndex
CREATE INDEX "dispute_evidence_dispute_id_idx"
ON "public"."dispute_evidence"("dispute_id");

-- CreateIndex
CREATE INDEX "dispute_evidence_uploaded_by_id_idx"
ON "public"."dispute_evidence"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "dispute_evidence_created_at_idx"
ON "public"."dispute_evidence"("created_at");

-- AddForeignKey
ALTER TABLE "public"."disputes"
ADD CONSTRAINT "disputes_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disputes"
ADD CONSTRAINT "disputes_order_item_id_fkey"
FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disputes"
ADD CONSTRAINT "disputes_opened_by_id_fkey"
FOREIGN KEY ("opened_by_id") REFERENCES "public"."users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disputes"
ADD CONSTRAINT "disputes_respondent_id_fkey"
FOREIGN KEY ("respondent_id") REFERENCES "public"."users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disputes"
ADD CONSTRAINT "disputes_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disputes"
ADD CONSTRAINT "disputes_resolved_by_id_fkey"
FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispute_messages"
ADD CONSTRAINT "dispute_messages_dispute_id_fkey"
FOREIGN KEY ("dispute_id") REFERENCES "public"."disputes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispute_messages"
ADD CONSTRAINT "dispute_messages_sender_id_fkey"
FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispute_evidence"
ADD CONSTRAINT "dispute_evidence_dispute_id_fkey"
FOREIGN KEY ("dispute_id") REFERENCES "public"."disputes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispute_evidence"
ADD CONSTRAINT "dispute_evidence_uploaded_by_id_fkey"
FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
