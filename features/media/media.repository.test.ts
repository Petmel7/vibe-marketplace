import { beforeEach, describe, expect, it, vi } from 'vitest'

const uploadMock = vi.fn()
const removeMock = vi.fn()
const getPublicUrlMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        remove: removeMock,
        getPublicUrl: getPublicUrlMock,
      })),
    },
  })),
}))

import { removePublicAsset, uploadPublicAsset } from '@/features/media/media.repository'
import { StoragePathConflictError, UploadFailedError } from '@/lib/errors/seller'

describe('media.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads public media and returns the public URL contract', async () => {
    uploadMock.mockResolvedValue({ error: null })
    getPublicUrlMock.mockReturnValue({
      data: {
        publicUrl: 'https://cdn.example.test/storage/v1/object/public/product-images/products/product-1/hash.png',
      },
    })

    const result = await uploadPublicAsset({
      bucket: 'product-images',
      path: 'products/product-1/hash.png',
      body: Uint8Array.from([1, 2, 3]),
      contentType: 'image/png',
    })

    expect(uploadMock).toHaveBeenCalledWith(
      'products/product-1/hash.png',
      expect.any(Uint8Array),
      expect.objectContaining({
        cacheControl: '3600',
        contentType: 'image/png',
        upsert: false,
      }),
    )
    expect(result).toEqual({
      url: 'https://cdn.example.test/storage/v1/object/public/product-images/products/product-1/hash.png',
      storagePath: 'products/product-1/hash.png',
    })
  })

  it('maps duplicate upload failures to storage path conflicts', async () => {
    uploadMock.mockResolvedValue({
      error: {
        message: 'The resource already exists',
      },
    })

    await expect(
      uploadPublicAsset({
        bucket: 'store-assets',
        path: 'stores/store-1/logo/hash.png',
        body: Uint8Array.from([1]),
        contentType: 'image/png',
      }),
    ).rejects.toThrow(StoragePathConflictError)
  })

  it('removes public media assets through the configured bucket', async () => {
    removeMock.mockResolvedValue({ error: null })

    await removePublicAsset('store-assets', 'stores/store-1/logo/hash.png')

    expect(removeMock).toHaveBeenCalledWith(['stores/store-1/logo/hash.png'])
  })

  it('maps remove failures to upload errors', async () => {
    removeMock.mockResolvedValue({
      error: {
        message: 'remove failed',
      },
    })

    await expect(removePublicAsset('store-assets', 'stores/store-1/logo/hash.png')).rejects.toThrow(
      UploadFailedError,
    )
  })
})
