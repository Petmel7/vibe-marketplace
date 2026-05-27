DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'EmailEventStatus'
  ) THEN
    CREATE TYPE "EmailEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'EmailDeliveryStatus'
  ) THEN
    CREATE TYPE "EmailDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'OPENED', 'CLICKED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'EmailProvider'
  ) THEN
    CREATE TYPE "EmailProvider" AS ENUM ('RESEND');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "public"."email_events" (
  "id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "recipient_email" TEXT NOT NULL,
  "recipient_user_id" UUID,
  "template" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "public"."EmailEventStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "next_attempt_at" TIMESTAMP(3),
  "processed_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."email_logs" (
  "id" UUID NOT NULL,
  "email_event_id" UUID,
  "provider" "public"."EmailProvider" NOT NULL,
  "provider_message_id" TEXT,
  "recipient_email" TEXT NOT NULL,
  "recipient_user_id" UUID,
  "template" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "public"."EmailDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "error_message" TEXT,
  "sent_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "bounced_at" TIMESTAMP(3),
  "opened_at" TIMESTAMP(3),
  "clicked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_events_dedupe_key_key"
  ON "public"."email_events"("dedupe_key");

CREATE INDEX IF NOT EXISTS "email_events_status_idx"
  ON "public"."email_events"("status");

CREATE INDEX IF NOT EXISTS "email_events_next_attempt_at_idx"
  ON "public"."email_events"("next_attempt_at");

CREATE INDEX IF NOT EXISTS "email_events_event_type_idx"
  ON "public"."email_events"("event_type");

CREATE INDEX IF NOT EXISTS "email_events_recipient_user_id_idx"
  ON "public"."email_events"("recipient_user_id");

CREATE INDEX IF NOT EXISTS "email_events_status_next_attempt_at_idx"
  ON "public"."email_events"("status", "next_attempt_at");

CREATE INDEX IF NOT EXISTS "email_logs_status_idx"
  ON "public"."email_logs"("status");

CREATE INDEX IF NOT EXISTS "email_logs_provider_message_id_idx"
  ON "public"."email_logs"("provider_message_id");

CREATE INDEX IF NOT EXISTS "email_logs_recipient_user_id_idx"
  ON "public"."email_logs"("recipient_user_id");

CREATE INDEX IF NOT EXISTS "email_logs_email_event_id_idx"
  ON "public"."email_logs"("email_event_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_events_recipient_user_id_fkey'
  ) THEN
    ALTER TABLE "public"."email_events"
      ADD CONSTRAINT "email_events_recipient_user_id_fkey"
      FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_logs_email_event_id_fkey'
  ) THEN
    ALTER TABLE "public"."email_logs"
      ADD CONSTRAINT "email_logs_email_event_id_fkey"
      FOREIGN KEY ("email_event_id") REFERENCES "public"."email_events"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_logs_recipient_user_id_fkey'
  ) THEN
    ALTER TABLE "public"."email_logs"
      ADD CONSTRAINT "email_logs_recipient_user_id_fkey"
      FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
