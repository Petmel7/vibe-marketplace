import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/media/media.repository')

import * as mediaRepository from '@/features/media/media.repository'
import {
  deleteCategoryImageBinary,
  deleteHeroBannerImageBinary,
  uploadCategoryImageBinary,
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

describe('uploadCategoryImageBinary', () => {
  it('uploads validated category images to the category-images bucket', async () => {
    const jpgBytes = Uint8Array.from([0xff, 0xd8, 0xff, 0x00])
    const file = new File([jpgBytes], 'category.jpg', { type: 'image/jpeg' })
    mockMediaRepository.uploadPublicAsset.mockResolvedValue({
      url: 'https://cdn.example.com/category-images/categories/cat-1/hash.jpg',
      storagePath: 'categories/cat-1/hash.jpg',
    })

    const result = await uploadCategoryImageBinary({
      categoryId: 'cat-1',
      file,
    })

    expect(mockMediaRepository.uploadPublicAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'category-images',
        contentType: 'image/jpeg',
        path: expect.stringMatching(/^categories\/cat-1\//),
      }),
    )
    expect(result.bucket).toBe('category-images')
    expect(result.storagePath).toMatch(/^categories\/cat-1\//)
  })

  it('rejects SVG category images', async () => {
    const file = new File([new TextEncoder().encode('<svg />')], 'category.svg', { type: 'image/svg+xml' })

    await expect(
      uploadCategoryImageBinary({
        categoryId: 'cat-1',
        file,
      }),
    ).rejects.toThrow(InvalidImageFileError)

    expect(mockMediaRepository.uploadPublicAsset).not.toHaveBeenCalled()
  })

  it('rejects category images larger than 2MB', async () => {
    const bytes = new Uint8Array(2 * 1024 * 1024 + 1)
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const file = new File([bytes], 'large.png', { type: 'image/png' })

    await expect(
      uploadCategoryImageBinary({
        categoryId: 'cat-1',
        file,
      }),
    ).rejects.toThrow(InvalidImageFileError)

    expect(mockMediaRepository.uploadPublicAsset).not.toHaveBeenCalled()
  })

  it('removes category images from the category-images bucket', async () => {
    await deleteCategoryImageBinary('categories/cat-1/hash.webp')

    expect(mockMediaRepository.removePublicAsset).toHaveBeenCalledWith(
      'category-images',
      'categories/cat-1/hash.webp',
    )
  })
})
