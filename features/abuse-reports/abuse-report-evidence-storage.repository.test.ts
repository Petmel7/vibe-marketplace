import { beforeEach, describe, expect, it, vi } from 'vitest'

const uploadMock = vi.fn()
const removeMock = vi.fn()
const createSignedUrlMock = vi.fn()

vi.mock('@/config/env', () => ({
  getServerEnv: vi.fn(() => ({
    SUPABASE_URL: 'https://example.supabase.co',
  })),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        remove: removeMock,
        createSignedUrl: createSignedUrlMock,
      })),
    },
  })),
}))

import {
  createSignedAbuseReportEvidenceUrl,
  uploadAbuseReportEvidenceAsset,
} from '@/features/abuse-reports/abuse-report-evidence-storage.repository'
import { EvidenceUploadFailedError } from '@/lib/errors/abuse-report'

describe('abuse-report-evidence-storage.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads evidence into the private bucket and returns an authenticated storage URL', async () => {
    uploadMock.mockResolvedValue({ error: null })

    const result = await uploadAbuseReportEvidenceAsset({
      storagePath: 'reports/report-1/evidence-1-proof.png',
      body: Uint8Array.from([1, 2, 3]),
      contentType: 'image/png',
    })

    expect(uploadMock).toHaveBeenCalledWith(
      'reports/report-1/evidence-1-proof.png',
      expect.any(Uint8Array),
      expect.objectContaining({
        cacheControl: '3600',
        contentType: 'image/png',
        upsert: false,
      }),
    )
    expect(result).toEqual({
      url: 'https://example.supabase.co/storage/v1/object/authenticated/abuse-report-evidence/reports/report-1/evidence-1-proof.png',
      storagePath: 'reports/report-1/evidence-1-proof.png',
    })
  })

  it('creates signed URLs for private evidence access', async () => {
    createSignedUrlMock.mockResolvedValue({
      data: {
        signedUrl: 'https://example.supabase.co/storage/v1/object/sign/abuse-report-evidence/foo',
      },
      error: null,
    })

    const signedUrl = await createSignedAbuseReportEvidenceUrl('reports/report-1/evidence-1-proof.png')

    expect(createSignedUrlMock).toHaveBeenCalledWith('reports/report-1/evidence-1-proof.png', 3600)
    expect(signedUrl).toContain('/storage/v1/object/sign/abuse-report-evidence/')
  })

  it('does not expose access when signed URL generation fails', async () => {
    createSignedUrlMock.mockResolvedValue({
      data: null,
      error: {
        message: 'forbidden',
      },
    })

    await expect(
      createSignedAbuseReportEvidenceUrl('reports/report-1/evidence-1-proof.png'),
    ).rejects.toThrow(EvidenceUploadFailedError)
  })
})
