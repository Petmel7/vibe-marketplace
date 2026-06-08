DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobStatus') THEN
    CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobType') THEN
    CREATE TYPE "JobType" AS ENUM (
      'SEND_EMAIL',
      'RECALCULATE_PRODUCT_METRICS',
      'RECALCULATE_RISK_PROFILE',
      'SYNC_SHIPMENT_STATUS',
      'RELEASE_SELLER_FUNDS',
      'REFRESH_ANALYTICS',
      'PROCESS_NOTIFICATION_DIGEST'
    );
  END IF;
END
$$;

CREATE TABLE "jobs" (
  "id" UUID NOT NULL,
  "type" "JobType" NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locked_at" TIMESTAMP(3),
  "processed_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "error_message" TEXT,
  "dedupe_key" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "jobs_dedupe_key_key" ON "jobs"("dedupe_key");
CREATE INDEX "jobs_type_idx" ON "jobs"("type");
CREATE INDEX "jobs_status_idx" ON "jobs"("status");
CREATE INDEX "jobs_run_at_idx" ON "jobs"("run_at");
CREATE INDEX "jobs_locked_at_idx" ON "jobs"("locked_at");
CREATE INDEX "jobs_processed_at_idx" ON "jobs"("processed_at");
CREATE INDEX "jobs_failed_at_idx" ON "jobs"("failed_at");
CREATE INDEX "jobs_status_run_at_idx" ON "jobs"("status", "run_at");
