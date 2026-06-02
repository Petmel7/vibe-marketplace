import type { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'

const reportEvidenceSelect = {
  id: true,
  reportId: true,
  uploadedById: true,
  url: true,
  storagePath: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  createdAt: true,
} satisfies Prisma.AbuseReportEvidenceSelect

export type AbuseReportEvidenceRecord = Prisma.AbuseReportEvidenceGetPayload<{
  select: typeof reportEvidenceSelect
}>

export async function findAbuseReportEvidenceAccessContext(
  reportId: string,
): Promise<{ id: string; reporterId: string } | null> {
  return prisma.abuseReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      reporterId: true,
    },
  })
}

export async function countEvidenceByReportId(reportId: string): Promise<number> {
  return prisma.abuseReportEvidence.count({
    where: { reportId },
  })
}

export async function createAbuseReportEvidenceRecord(input: {
  id: string
  reportId: string
  uploadedById: string
  url: string
  storagePath: string
  fileName: string
  fileType: string
  fileSize: number
}): Promise<AbuseReportEvidenceRecord> {
  return prisma.abuseReportEvidence.create({
    data: input,
    select: reportEvidenceSelect,
  })
}

export async function listEvidenceByReportId(
  reportId: string,
): Promise<AbuseReportEvidenceRecord[]> {
  return prisma.abuseReportEvidence.findMany({
    where: { reportId },
    orderBy: [{ createdAt: 'desc' }],
    select: reportEvidenceSelect,
  })
}

export async function findEvidenceById(
  evidenceId: string,
): Promise<AbuseReportEvidenceRecord | null> {
  return prisma.abuseReportEvidence.findUnique({
    where: { id: evidenceId },
    select: reportEvidenceSelect,
  })
}

export async function deleteEvidenceById(evidenceId: string): Promise<void> {
  await prisma.abuseReportEvidence.delete({
    where: { id: evidenceId },
  })
}
