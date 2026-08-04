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
import { UPLOAD_BUCKETS } from '@/lib/upload/upload.config'
import { cleanupStoredUpload, uploadAndPersist } from '@/lib/upload/upload.service'
import { validateUploadFileMetadata } from '@/lib/upload/upload.validation'
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

function assertEvidenceFile(file: File): { contentType: string; safeFileName: string } {
  const validated = validateUploadFileMetadata({
    file,
    maxBytes: MAX_EVIDENCE_BYTES,
    allowedContentTypes: ALLOWED_EVIDENCE_TYPES,
    fallbackFilename: 'evidence',
    createError: (message) => new InvalidEvidenceFileError(message),
    messages: {
      invalidFile: 'A valid evidence file is required',
      emptyFile: 'Evidence file cannot be empty',
      maxBytes: 'Evidence file exceeds the 10MB limit',
      unsupportedType: 'Only JPG, JPEG, PNG, WEBP, and PDF files are supported',
    },
  })

  return {
    contentType: validated.contentType,
    safeFileName: validated.filename,
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

  let record: AbuseReportEvidenceRecord
  try {
    const result = await uploadAndPersist({
      upload: async () => {
        const uploaded = await uploadAbuseReportEvidenceAsset({
          storagePath,
          body: bytes,
          contentType: validatedFile.contentType,
        })

        return {
          bucket: UPLOAD_BUCKETS.abuseReportEvidence,
          url: uploaded.url,
          storagePath: uploaded.storagePath,
          contentType: validatedFile.contentType,
          size: file.size,
          filename: validatedFile.safeFileName,
        }
      },
      persist: (uploaded) =>
        createAbuseReportEvidenceRecord({
          id: evidenceId,
          reportId,
          uploadedById: user.id,
          url: uploaded.url,
          storagePath: uploaded.storagePath,
          fileName: uploaded.filename,
          fileType: uploaded.contentType,
          fileSize: uploaded.size,
        }),
      deleteUploadedObject: removeAbuseReportEvidenceAsset,
      cleanupUploadedLabel: 'uploadReportEvidence.cleanup',
      context: { reportId, evidenceId },
    })
    record = result.persisted
  } catch (error) {
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

  await deleteEvidenceById(evidenceId)
  await cleanupStoredUpload({
    previous: {
      bucket: UPLOAD_BUCKETS.abuseReportEvidence,
      storagePath: evidence.storagePath,
    },
    deleteObject: removeAbuseReportEvidenceAsset,
    label: 'deleteReportEvidence.cleanup',
    context: { reportId, evidenceId },
  })

  return { id: evidenceId }
}
