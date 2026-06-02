-- CreateTable
CREATE TABLE "public"."abuse_report_evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abuse_report_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "abuse_report_evidence_report_id_idx"
ON "public"."abuse_report_evidence"("report_id");

-- CreateIndex
CREATE INDEX "abuse_report_evidence_uploaded_by_id_idx"
ON "public"."abuse_report_evidence"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "abuse_report_evidence_created_at_idx"
ON "public"."abuse_report_evidence"("created_at");

-- AddForeignKey
ALTER TABLE "public"."abuse_report_evidence"
ADD CONSTRAINT "abuse_report_evidence_report_id_fkey"
FOREIGN KEY ("report_id") REFERENCES "public"."abuse_reports"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."abuse_report_evidence"
ADD CONSTRAINT "abuse_report_evidence_uploaded_by_id_fkey"
FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
