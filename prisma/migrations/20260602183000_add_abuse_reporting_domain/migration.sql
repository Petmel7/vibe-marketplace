-- CreateEnum
CREATE TYPE "public"."AbuseReportTargetType" AS ENUM (
  'PRODUCT',
  'REVIEW',
  'STORE',
  'USER',
  'ORDER'
);

-- CreateEnum
CREATE TYPE "public"."AbuseReportReason" AS ENUM (
  'SPAM',
  'SCAM',
  'COUNTERFEIT',
  'PROHIBITED_ITEM',
  'INAPPROPRIATE_CONTENT',
  'HARASSMENT',
  'MISLEADING_INFO',
  'PAYMENT_ISSUE',
  'DELIVERY_ISSUE',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "public"."AbuseReportStatus" AS ENUM (
  'PENDING',
  'UNDER_REVIEW',
  'RESOLVED',
  'DISMISSED',
  'ESCALATED'
);

-- CreateEnum
CREATE TYPE "public"."AbuseReportActionType" AS ENUM (
  'NO_ACTION',
  'WARN_USER',
  'HIDE_REVIEW',
  'REJECT_PRODUCT',
  'ARCHIVE_PRODUCT',
  'SUSPEND_SELLER',
  'SUSPEND_STORE',
  'ESCALATE'
);

-- CreateTable
CREATE TABLE "public"."abuse_reports" (
  "id" UUID NOT NULL,
  "reporter_id" UUID NOT NULL,
  "target_type" "public"."AbuseReportTargetType" NOT NULL,
  "target_id" TEXT NOT NULL,
  "reason" "public"."AbuseReportReason" NOT NULL,
  "description" TEXT,
  "status" "public"."AbuseReportStatus" NOT NULL DEFAULT 'PENDING',
  "assigned_admin_id" UUID,
  "resolved_by_id" UUID,
  "resolved_at" TIMESTAMP(3),
  "resolution_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "abuse_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."abuse_report_actions" (
  "id" UUID NOT NULL,
  "report_id" UUID NOT NULL,
  "admin_id" UUID NOT NULL,
  "action_type" "public"."AbuseReportActionType" NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "abuse_report_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "abuse_reports_reporter_id_idx"
ON "public"."abuse_reports"("reporter_id");

-- CreateIndex
CREATE INDEX "abuse_reports_target_type_target_id_idx"
ON "public"."abuse_reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "abuse_reports_status_idx"
ON "public"."abuse_reports"("status");

-- CreateIndex
CREATE INDEX "abuse_reports_reason_idx"
ON "public"."abuse_reports"("reason");

-- CreateIndex
CREATE INDEX "abuse_reports_assigned_admin_id_idx"
ON "public"."abuse_reports"("assigned_admin_id");

-- CreateIndex
CREATE INDEX "abuse_reports_resolved_by_id_idx"
ON "public"."abuse_reports"("resolved_by_id");

-- CreateIndex
CREATE INDEX "abuse_reports_created_at_idx"
ON "public"."abuse_reports"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "abuse_reports_active_dedupe_idx"
ON "public"."abuse_reports"("reporter_id", "target_type", "target_id")
WHERE "status" IN ('PENDING', 'UNDER_REVIEW', 'ESCALATED');

-- CreateIndex
CREATE INDEX "abuse_report_actions_report_id_idx"
ON "public"."abuse_report_actions"("report_id");

-- CreateIndex
CREATE INDEX "abuse_report_actions_admin_id_idx"
ON "public"."abuse_report_actions"("admin_id");

-- CreateIndex
CREATE INDEX "abuse_report_actions_action_type_idx"
ON "public"."abuse_report_actions"("action_type");

-- CreateIndex
CREATE INDEX "abuse_report_actions_created_at_idx"
ON "public"."abuse_report_actions"("created_at");

-- AddForeignKey
ALTER TABLE "public"."abuse_reports"
  ADD CONSTRAINT "abuse_reports_reporter_id_fkey"
  FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."abuse_reports"
  ADD CONSTRAINT "abuse_reports_assigned_admin_id_fkey"
  FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."abuse_reports"
  ADD CONSTRAINT "abuse_reports_resolved_by_id_fkey"
  FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."abuse_report_actions"
  ADD CONSTRAINT "abuse_report_actions_report_id_fkey"
  FOREIGN KEY ("report_id") REFERENCES "public"."abuse_reports"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."abuse_report_actions"
  ADD CONSTRAINT "abuse_report_actions_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
