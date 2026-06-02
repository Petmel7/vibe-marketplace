import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRole } from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import {
  EvidenceLimitExceededError,
  EvidenceOwnershipError,
  InvalidEvidenceFileError,
} from '@/lib/errors/abuse-report'
import * as evidenceRepository from './abuse-report-evidence.repository'
import * as evidenceStorageRepository from './abuse-report-evidence-storage.repository'
import * as evidenceService from './abuse-report-evidence.service'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('./abuse-report-evidence.repository')
vi.mock('./abuse-report-evidence-storage.repository')
vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
}))

const mockRepository = vi.mocked(evidenceRepository)
const mockStorageRepository = vi.mocked(evidenceStorageRepository)

const buyerUser: SessionUser = {
  id: 'buyer-1',
  email: 'buyer@example.com',
  roles: [UserRole.BUYER],
}

const adminUser: SessionUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
}

function createFile(name: string, type: string, size = 512): File {
  return new File([new Uint8Array(size).fill(1)], name, { type })
}

function makeEvidenceRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evidence-1',
    reportId: 'report-1',
    uploadedById: buyerUser.id,
    url: 'https://example.test/object',
    storagePath: 'reports/report-1/evidence-1-proof.png',
    fileName: 'proof.png',
    fileType: 'image/png',
    fileSize: 512,
    createdAt: new Date('2026-06-02T12:00:00.000Z'),
    ...overrides,
  }
}

describe('abuse-report-evidence.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRepository.findAbuseReportEvidenceAccessContext.mockResolvedValue({
      id: 'report-1',
      reporterId: buyerUser.id,
    })
    mockStorageRepository.createSignedAbuseReportEvidenceUrl.mockResolvedValue(
      'https://signed.example.test/evidence',
    )
  })

  it('lets the reporter upload evidence to their own report', async () => {
    mockRepository.countEvidenceByReportId.mockResolvedValue(0)
    mockStorageRepository.uploadAbuseReportEvidenceAsset.mockResolvedValue({
      url: 'https://storage.example.test/object',
      storagePath: 'reports/report-1/evidence-1-proof.png',
    })
    mockRepository.createAbuseReportEvidenceRecord.mockResolvedValue(makeEvidenceRecord() as never)

    const result = await evidenceService.uploadReportEvidence(
      buyerUser,
      'report-1',
      createFile('proof.png', 'image/png'),
    )

    expect(mockStorageRepository.uploadAbuseReportEvidenceAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        storagePath: expect.stringMatching(/^reports\/report-1\/.+-proof\.png$/),
        contentType: 'image/png',
      }),
    )
    expect(result.fileName).toBe('proof.png')
    expect(result.url).toBe('https://signed.example.test/evidence')
  })

  it('enforces the max file count per report', async () => {
    mockRepository.countEvidenceByReportId.mockResolvedValue(5)

    await expect(
      evidenceService.uploadReportEvidence(
        buyerUser,
        'report-1',
        createFile('proof.png', 'image/png'),
      ),
    ).rejects.toThrow(EvidenceLimitExceededError)
  })

  it('rejects invalid file types', async () => {
    mockRepository.countEvidenceByReportId.mockResolvedValue(0)

    await expect(
      evidenceService.uploadReportEvidence(
        buyerUser,
        'report-1',
        createFile('proof.exe', 'application/x-msdownload'),
      ),
    ).rejects.toThrow(InvalidEvidenceFileError)
  })

  it('rejects oversized files', async () => {
    mockRepository.countEvidenceByReportId.mockResolvedValue(0)

    await expect(
      evidenceService.uploadReportEvidence(
        buyerUser,
        'report-1',
        createFile('proof.pdf', 'application/pdf', 10 * 1024 * 1024 + 1),
      ),
    ).rejects.toThrow(InvalidEvidenceFileError)
  })

  it('blocks uploads to another reporter report', async () => {
    mockRepository.findAbuseReportEvidenceAccessContext.mockResolvedValue({
      id: 'report-1',
      reporterId: 'buyer-2',
    })

    await expect(
      evidenceService.uploadReportEvidence(
        buyerUser,
        'report-1',
        createFile('proof.png', 'image/png'),
      ),
    ).rejects.toThrow(EvidenceOwnershipError)
  })

  it('lets admins view evidence for any report', async () => {
    mockRepository.listEvidenceByReportId.mockResolvedValue([makeEvidenceRecord()] as never)

    const result = await evidenceService.getAdminReportEvidence(adminUser, 'report-1')

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.id).toBe('evidence-1')
  })

  it('deletes evidence from storage and the database', async () => {
    mockRepository.findEvidenceById.mockResolvedValue(makeEvidenceRecord() as never)

    const result = await evidenceService.deleteReportEvidence(
      buyerUser,
      'report-1',
      'evidence-1',
    )

    expect(mockStorageRepository.removeAbuseReportEvidenceAsset).toHaveBeenCalledWith(
      'reports/report-1/evidence-1-proof.png',
    )
    expect(mockRepository.deleteEvidenceById).toHaveBeenCalledWith('evidence-1')
    expect(result.id).toBe('evidence-1')
  })
})
