import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/media/media.repository')

import * as mediaRepository from '@/features/media/media.repository'
import {
  deleteHeroBannerImageBinary,
  uploadHeroBannerImageBinary,
  uploadProductImageBinary,
  uploadStoreAssetBinary,
} from '@/features/media/media.service'
import { InvalidImageFileError } from '@/lib/errors/seller'

const mockMediaRepository = vi.mocked(mediaRepository)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('uploadStoreAssetBinary', () => {
  it('uploads validated store asset metadata to the store-assets bucket', async () => {
    const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const file = new File([pngBytes], 'logo.png', { type: 'image/png' })
    mockMediaRepository.uploadPublicAsset.mockResolvedValue({
      url: 'https://cdn.example.com/stores/store-1/logo/hash.png',
      storagePath: 'stores/store-1/logo/hash.png',
    })

    const result = await uploadStoreAssetBinary({
      storeId: 'store-1',
      kind: 'logo',
      file,
    })

    expect(mockMediaRepository.uploadPublicAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'store-assets',
        contentType: 'image/png',
        path: expect.stringMatching(/^stores\/store-1\/logo\//),
      }),
    )
    expect(result.bucket).toBe('store-assets')
    expect(result.storagePath).toMatch(/^stores\/store-1\/logo\//)
  })
})

describe('uploadProductImageBinary', () => {
  it('rejects unsupported product image files before upload', async () => {
    const file = new File([Uint8Array.from([0x00, 0x01, 0x02])], 'bad.bin', { type: 'application/octet-stream' })

    await expect(
      uploadProductImageBinary({
        productId: 'product-1',
        file,
      }),
    ).rejects.toThrow(InvalidImageFileError)

    expect(mockMediaRepository.uploadPublicAsset).not.toHaveBeenCalled()
  })
})

describe('uploadHeroBannerImageBinary', () => {
  it('uploads validated hero images to the hero-banners bucket and slot folder', async () => {
    const webpBytes = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
    const file = new File([webpBytes], 'hero.webp', { type: 'image/webp' })
    mockMediaRepository.uploadPublicAsset.mockResolvedValue({
      url: 'https://cdn.example.com/hero-banners/desktop/hash.webp',
      storagePath: 'hero-banners/desktop/hash.webp',
    })

    const result = await uploadHeroBannerImageBinary({
      slot: 'desktop',
      file,
    })

    expect(mockMediaRepository.uploadPublicAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'hero-banners',
        contentType: 'image/webp',
        path: expect.stringMatching(/^hero-banners\/desktop\//),
      }),
    )
    expect(result.bucket).toBe('hero-banners')
    expect(result.storagePath).toMatch(/^hero-banners\/desktop\//)
  })

  it('removes hero banner images from the hero-banners bucket', async () => {
    await deleteHeroBannerImageBinary('hero-banners/mobile/hash.webp')

    expect(mockMediaRepository.removePublicAsset).toHaveBeenCalledWith(
      'hero-banners',
      'hero-banners/mobile/hash.webp',
    )
  })
})
