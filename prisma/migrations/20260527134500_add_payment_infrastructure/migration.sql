DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'PaymentProvider'
  ) THEN
    CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'LIQPAY', 'WAYFORPAY', 'MANUAL');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'PaymentStatus'
  ) THEN
    CREATE TYPE "PaymentStatus" AS ENUM (
      'PENDING',
      'PROCESSING',
      'SUCCEEDED',
      'FAILED',
      'CANCELLED',
      'REFUNDED',
      'PARTIALLY_REFUNDED'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'PaymentMethod'
  ) THEN
    CREATE TYPE "PaymentMethod" AS ENUM (
      'CARD',
      'APPLE_PAY',
      'GOOGLE_PAY',
      'CASH_ON_DELIVERY',
      'MANUAL'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'RefundStatus'
  ) THEN
    CREATE TYPE "RefundStatus" AS ENUM (
      'PENDING',
      'PROCESSING',
      'SUCCEEDED',
      'FAILED',
      'CANCELLED'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "public"."payments" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "provider" "public"."PaymentProvider" NOT NULL,
  "provider_payment_id" TEXT,
  "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "method" "public"."PaymentMethod" NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "checkout_url" TEXT,
  "failure_reason" TEXT,
  "paid_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."payment_attempts" (
  "id" UUID NOT NULL,
  "payment_id" UUID NOT NULL,
  "provider" "public"."PaymentProvider" NOT NULL,
  "status" "public"."PaymentStatus" NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "request_payload" JSONB NOT NULL,
  "response_payload" JSONB,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."payment_webhook_events" (
  "id" UUID NOT NULL,
  "payment_id" UUID,
  "provider" "public"."PaymentProvider" NOT NULL,
  "provider_event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "signature_valid" BOOLEAN NOT NULL DEFAULT false,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."refunds" (
  "id" UUID NOT NULL,
  "payment_id" UUID NOT NULL,
  "order_item_id" UUID,
  "provider_refund_id" TEXT,
  "status" "public"."RefundStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(12, 2) NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payments_order_id_idx"
  ON "public"."payments"("order_id");

CREATE INDEX IF NOT EXISTS "payments_status_idx"
  ON "public"."payments"("status");

CREATE INDEX IF NOT EXISTS "payments_provider_idx"
  ON "public"."payments"("provider");

CREATE INDEX IF NOT EXISTS "payments_provider_payment_id_idx"
  ON "public"."payments"("provider_payment_id");

CREATE INDEX IF NOT EXISTS "payment_attempts_payment_id_idx"
  ON "public"."payment_attempts"("payment_id");

CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhook_events_provider_provider_event_id_key"
  ON "public"."payment_webhook_events"("provider", "provider_event_id");

CREATE INDEX IF NOT EXISTS "payment_webhook_events_provider_event_id_idx"
  ON "public"."payment_webhook_events"("provider_event_id");

CREATE INDEX IF NOT EXISTS "payment_webhook_events_payment_id_idx"
  ON "public"."payment_webhook_events"("payment_id");

CREATE INDEX IF NOT EXISTS "refunds_payment_id_idx"
  ON "public"."refunds"("payment_id");

CREATE INDEX IF NOT EXISTS "refunds_status_idx"
  ON "public"."refunds"("status");

CREATE INDEX IF NOT EXISTS "refunds_order_item_id_idx"
  ON "public"."refunds"("order_item_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_order_id_fkey'
  ) THEN
    ALTER TABLE "public"."payments"
      ADD CONSTRAINT "payments_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_attempts_payment_id_fkey'
  ) THEN
    ALTER TABLE "public"."payment_attempts"
      ADD CONSTRAINT "payment_attempts_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_webhook_events_payment_id_fkey'
  ) THEN
    ALTER TABLE "public"."payment_webhook_events"
      ADD CONSTRAINT "payment_webhook_events_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'refunds_payment_id_fkey'
  ) THEN
    ALTER TABLE "public"."refunds"
      ADD CONSTRAINT "refunds_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'refunds_order_item_id_fkey'
  ) THEN
    ALTER TABLE "public"."refunds"
      ADD CONSTRAINT "refunds_order_item_id_fkey"
      FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
