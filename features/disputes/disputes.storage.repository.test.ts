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
  createSignedDisputeEvidenceUrl,
  uploadDisputeEvidenceAsset,
} from '@/features/disputes/disputes.storage.repository'
import { DisputeEvidenceUploadError } from '@/lib/errors/dispute'

describe('disputes.storage.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads dispute evidence into a private bucket and stores an authenticated path', async () => {
    uploadMock.mockResolvedValue({ error: null })

    const result = await uploadDisputeEvidenceAsset({
      storagePath: 'disputes/dispute-1/evidence-1-proof.pdf',
      body: Uint8Array.from([1, 2, 3]),
      contentType: 'application/pdf',
    })

    expect(uploadMock).toHaveBeenCalledWith(
      'disputes/dispute-1/evidence-1-proof.pdf',
      expect.any(Uint8Array),
      expect.objectContaining({
        cacheControl: '3600',
        contentType: 'application/pdf',
        upsert: false,
      }),
    )
    expect(result).toEqual({
      url: 'https://example.supabase.co/storage/v1/object/authenticated/dispute-evidence/disputes/dispute-1/evidence-1-proof.pdf',
      storagePath: 'disputes/dispute-1/evidence-1-proof.pdf',
    })
  })

  it('creates signed URLs for dispute evidence access', async () => {
    createSignedUrlMock.mockResolvedValue({
      data: {
        signedUrl: 'https://example.supabase.co/storage/v1/object/sign/dispute-evidence/foo',
      },
      error: null,
    })

    const signedUrl = await createSignedDisputeEvidenceUrl('disputes/dispute-1/evidence-1-proof.pdf')

    expect(createSignedUrlMock).toHaveBeenCalledWith('disputes/dispute-1/evidence-1-proof.pdf', 3600)
    expect(signedUrl).toContain('/storage/v1/object/sign/dispute-evidence/')
  })

  it('rejects signed URL access when Supabase refuses the request', async () => {
    createSignedUrlMock.mockResolvedValue({
      data: null,
      error: {
        message: 'forbidden',
      },
    })

    await expect(
      createSignedDisputeEvidenceUrl('disputes/dispute-1/evidence-1-proof.pdf'),
    ).rejects.toThrow(DisputeEvidenceUploadError)
  })
})
