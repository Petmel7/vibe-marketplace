DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'NotificationType'
  ) THEN
    CREATE TYPE "NotificationType" AS ENUM (
      'ORDER_CREATED',
      'PAYMENT_SUCCEEDED',
      'PAYMENT_FAILED',
      'ORDER_SHIPPED',
      'SELLER_APPROVED',
      'SELLER_REJECTED',
      'PRODUCT_APPROVED',
      'PRODUCT_REJECTED',
      'SELLER_NEW_ORDER',
      'ADMIN_ALERT'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "public"."NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "action_url" TEXT,
  "metadata" JSONB,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx"
  ON "notifications"("user_id");

CREATE INDEX IF NOT EXISTS "notifications_user_id_read_at_idx"
  ON "notifications"("user_id", "read_at");

CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx"
  ON "notifications"("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "notifications_type_idx"
  ON "notifications"("type");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
