-- CreateEnum
CREATE TYPE "SellerLedgerEntryType" AS ENUM ('CREDIT', 'DEBIT', 'HOLD', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SellerLedgerEntryStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('MANUAL', 'BANK_TRANSFER');

-- CreateTable
CREATE TABLE "platform_commissions" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "gross_amount" DECIMAL(12,2) NOT NULL,
    "commission_rate" DECIMAL(5,4) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "seller_net_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_ledger_entries" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "order_item_id" UUID,
    "payout_id" UUID,
    "type" "SellerLedgerEntryType" NOT NULL,
    "status" "SellerLedgerEntryStatus" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "description" TEXT NOT NULL,
    "available_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_balances" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "pending_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "available_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_out_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "admin_note" TEXT,
    "created_by_id" UUID NOT NULL,
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_items" (
    "id" UUID NOT NULL,
    "payout_id" UUID NOT NULL,
    "ledger_entry_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_commissions_order_item_id_key" ON "platform_commissions"("order_item_id");

-- CreateIndex
CREATE INDEX "platform_commissions_store_id_idx" ON "platform_commissions"("store_id");

-- CreateIndex
CREATE INDEX "platform_commissions_seller_id_idx" ON "platform_commissions"("seller_id");

-- CreateIndex
CREATE INDEX "platform_commissions_created_at_idx" ON "platform_commissions"("created_at");

-- CreateIndex
CREATE INDEX "seller_ledger_entries_store_id_idx" ON "seller_ledger_entries"("store_id");

-- CreateIndex
CREATE INDEX "seller_ledger_entries_seller_id_idx" ON "seller_ledger_entries"("seller_id");

-- CreateIndex
CREATE INDEX "seller_ledger_entries_order_item_id_idx" ON "seller_ledger_entries"("order_item_id");

-- CreateIndex
CREATE INDEX "seller_ledger_entries_payout_id_idx" ON "seller_ledger_entries"("payout_id");

-- CreateIndex
CREATE INDEX "seller_ledger_entries_type_idx" ON "seller_ledger_entries"("type");

-- CreateIndex
CREATE INDEX "seller_ledger_entries_status_idx" ON "seller_ledger_entries"("status");

-- CreateIndex
CREATE INDEX "seller_ledger_entries_available_at_idx" ON "seller_ledger_entries"("available_at");

-- CreateIndex
CREATE INDEX "seller_ledger_entries_created_at_idx" ON "seller_ledger_entries"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "seller_balances_store_id_key" ON "seller_balances"("store_id");

-- CreateIndex
CREATE INDEX "seller_balances_seller_id_idx" ON "seller_balances"("seller_id");

-- CreateIndex
CREATE INDEX "payouts_store_id_idx" ON "payouts"("store_id");

-- CreateIndex
CREATE INDEX "payouts_seller_id_idx" ON "payouts"("seller_id");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "payouts_created_by_id_idx" ON "payouts"("created_by_id");

-- CreateIndex
CREATE INDEX "payouts_created_at_idx" ON "payouts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payout_items_ledger_entry_id_key" ON "payout_items"("ledger_entry_id");

-- CreateIndex
CREATE INDEX "payout_items_payout_id_idx" ON "payout_items"("payout_id");

-- CreateIndex
CREATE INDEX "payout_items_created_at_idx" ON "payout_items"("created_at");

-- AddForeignKey
ALTER TABLE "platform_commissions" ADD CONSTRAINT "platform_commissions_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_commissions" ADD CONSTRAINT "platform_commissions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_commissions" ADD CONSTRAINT "platform_commissions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_ledger_entries" ADD CONSTRAINT "seller_ledger_entries_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_ledger_entries" ADD CONSTRAINT "seller_ledger_entries_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_ledger_entries" ADD CONSTRAINT "seller_ledger_entries_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_ledger_entries" ADD CONSTRAINT "seller_ledger_entries_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_balances" ADD CONSTRAINT "seller_balances_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_balances" ADD CONSTRAINT "seller_balances_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "seller_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
