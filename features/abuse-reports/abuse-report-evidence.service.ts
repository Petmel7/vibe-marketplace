import { UserRole } from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import { assertAdminAccess } from '@/lib/auth/adminGuards'
import {
  AbuseReportNotFoundError,
  EvidenceLimitExceededError,
  EvidenceNotFoundError,
  EvidenceOwnershipError,
  EvidenceUploadFailedError,
  InvalidEvidenceFileError,
} from '@/lib/errors/abuse-report'
import { logError } from '@/utils/logger'
import type {
  AbuseReportEvidenceDto,
  AbuseReportEvidenceListDto,
} from './abuse-report-evidence.dto'
import {
  countEvidenceByReportId,
  createAbuseReportEvidenceRecord,
  deleteEvidenceById,
  findAbuseReportEvidenceAccessContext,
  findEvidenceById,
  listEvidenceByReportId,
  type AbuseReportEvidenceRecord,
} from './abuse-report-evidence.repository'
import {
  createSignedAbuseReportEvidenceUrl,
  removeAbuseReportEvidenceAsset,
  uploadAbuseReportEvidenceAsset,
} from './abuse-report-evidence-storage.repository'

const MAX_EVIDENCE_FILES = 5
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024
const ALLOWED_EVIDENCE_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
])

function sanitizeFileName(fileName: string, extension: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '')
  const normalized = baseName
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 80)

  const safeBaseName = normalized || 'evidence'
  return `${safeBaseName}.${extension}`
}

function assertEvidenceFile(file: File): { contentType: string; safeFileName: string } {
  if (!(file instanceof File)) {
    throw new InvalidEvidenceFileError('A valid evidence file is required')
  }

  if (file.size <= 0) {
    throw new InvalidEvidenceFileError('Evidence file cannot be empty')
  }

  if (file.size > MAX_EVIDENCE_BYTES) {
    throw new InvalidEvidenceFileError('Evidence file exceeds the 10MB limit')
  }

  const contentType = file.type.trim().toLowerCase()
  const extension = ALLOWED_EVIDENCE_TYPES.get(contentType)

  if (!extension) {
    throw new InvalidEvidenceFileError('Only JPG, JPEG, PNG, WEBP, and PDF files are supported')
  }

  return {
    contentType,
    safeFileName: sanitizeFileName(file.name, extension),
  }
}

function toEvidenceDto(
  record: AbuseReportEvidenceRecord,
  signedUrl: string,
): AbuseReportEvidenceDto {
  return {
    id: record.id,
    url: signedUrl,
    fileName: record.fileName,
    fileType: record.fileType,
    fileSize: record.fileSize,
    createdAt: record.createdAt.toISOString(),
  }
}

async function getOwnedReport(reportId: string, userId: string): Promise<{ id: string; reporterId: string }> {
  const report = await findAbuseReportEvidenceAccessContext(reportId)
  if (!report) {
    throw new AbuseReportNotFoundError()
  }

  if (report.reporterId !== userId) {
    throw new EvidenceOwnershipError('You do not have access to this report evidence')
  }

  return report
}

async function getExistingReport(reportId: string): Promise<{ id: string; reporterId: string }> {
  const report = await findAbuseReportEvidenceAccessContext(reportId)
  if (!report) {
    throw new AbuseReportNotFoundError()
  }

  return report
}

export async function uploadReportEvidence(
  user: SessionUser,
  reportId: string,
  file: File,
): Promise<AbuseReportEvidenceDto> {
  await getOwnedReport(reportId, user.id)

  const currentCount = await countEvidenceByReportId(reportId)
  if (currentCount >= MAX_EVIDENCE_FILES) {
    throw new EvidenceLimitExceededError(`A report can have at most ${MAX_EVIDENCE_FILES} evidence files`)
  }

  const validatedFile = assertEvidenceFile(file)
  const evidenceId = crypto.randomUUID()
  const storagePath = `reports/${reportId}/${evidenceId}-${validatedFile.safeFileName}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const uploaded = await uploadAbuseReportEvidenceAsset({
    storagePath,
    body: bytes,
    contentType: validatedFile.contentType,
  })

  let record: AbuseReportEvidenceRecord
  try {
    record = await createAbuseReportEvidenceRecord({
      id: evidenceId,
      reportId,
      uploadedById: user.id,
      url: uploaded.url,
      storagePath: uploaded.storagePath,
      fileName: validatedFile.safeFileName,
      fileType: validatedFile.contentType,
      fileSize: file.size,
    })
  } catch (error) {
    try {
      await removeAbuseReportEvidenceAsset(storagePath)
    } catch (cleanupError) {
      logError('uploadReportEvidence.cleanup', cleanupError)
    }

    if (error instanceof Error) {
      throw error
    }

    throw new EvidenceUploadFailedError()
  }

  try {
    const signedUrl = await createSignedAbuseReportEvidenceUrl(record.storagePath)
    return toEvidenceDto(record, signedUrl)
  } catch (error) {
    logError('uploadReportEvidence.sign', error)
    return toEvidenceDto(record, record.url)
  }
}

export async function getMyReportEvidence(
  user: SessionUser,
  reportId: string,
): Promise<AbuseReportEvidenceListDto> {
  await getOwnedReport(reportId, user.id)
  const evidence = await listEvidenceByReportId(reportId)
  const items = await Promise.all(
    evidence.map(async (record) => {
      try {
        return toEvidenceDto(record, await createSignedAbuseReportEvidenceUrl(record.storagePath))
      } catch (error) {
        logError('getMyReportEvidence.sign', error)
        return toEvidenceDto(record, record.url)
      }
    }),
  )

  return { items }
}

export async function getAdminReportEvidence(
  user: SessionUser,
  reportId: string,
): Promise<AbuseReportEvidenceListDto> {
  assertAdminAccess(user)
  await getExistingReport(reportId)

  const evidence = await listEvidenceByReportId(reportId)
  const items = await Promise.all(
    evidence.map(async (record) => {
      try {
        return toEvidenceDto(record, await createSignedAbuseReportEvidenceUrl(record.storagePath))
      } catch (error) {
        logError('getAdminReportEvidence.sign', error)
        return toEvidenceDto(record, record.url)
      }
    }),
  )

  return { items }
}

export async function deleteReportEvidence(
  user: SessionUser,
  reportId: string,
  evidenceId: string,
): Promise<{ id: string }> {
  const isAdmin = user.roles.includes(UserRole.ADMIN)
  if (isAdmin) {
    assertAdminAccess(user)
    await getExistingReport(reportId)
  } else {
    await getOwnedReport(reportId, user.id)
  }

  const evidence = await findEvidenceById(evidenceId)
  if (!evidence || evidence.reportId !== reportId) {
    throw new EvidenceNotFoundError()
  }

  if (!isAdmin && evidence.uploadedById !== user.id) {
    throw new EvidenceOwnershipError()
  }

  await removeAbuseReportEvidenceAsset(evidence.storagePath)
  await deleteEvidenceById(evidenceId)

  return { id: evidenceId }
}
