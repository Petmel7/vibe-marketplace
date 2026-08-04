import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanupStoredUpload,
  replaceStoredUpload,
  uploadAndPersist,
  type UploadResult,
} from './upload.service'
import {
  sanitizeUploadFilename,
  validateUploadFileMetadata,
} from './upload.validation'

vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
}))

const uploaded: UploadResult = {
  bucket: 'product-images',
  url: 'https://cdn.example.com/new.png',
  storagePath: 'products/product-1/new.png',
  contentType: 'image/png',
  size: 4,
  filename: 'new.png',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('upload lifecycle foundation', () => {
  it('uploads and persists storage metadata', async () => {
    const upload = vi.fn().mockResolvedValue(uploaded)
    const persist = vi.fn().mockResolvedValue({ id: 'image-1' })
    const cleanup = vi.fn()

    const result = await uploadAndPersist({
      upload,
      persist,
      deleteUploadedObject: cleanup,
      cleanupUploadedLabel: 'test:cleanup-uploaded',
    })

    expect(result).toEqual({ uploaded, persisted: { id: 'image-1' } })
    expect(persist).toHaveBeenCalledWith(uploaded)
    expect(cleanup).not.toHaveBeenCalled()
  })

  it('deletes a newly uploaded object when persistence fails without masking the persistence error', async () => {
    const error = new Error('db down')
    const upload = vi.fn().mockResolvedValue(uploaded)
    const persist = vi.fn().mockRejectedValue(error)
    const cleanup = vi.fn().mockResolvedValue(undefined)

    await expect(
      uploadAndPersist({
        upload,
        persist,
        deleteUploadedObject: cleanup,
        cleanupUploadedLabel: 'test:cleanup-uploaded',
      }),
    ).rejects.toBe(error)

    expect(cleanup).toHaveBeenCalledWith(uploaded.storagePath)
  })

  it('replaces an existing object after new metadata is persisted', async () => {
    const upload = vi.fn().mockResolvedValue(uploaded)
    const persist = vi.fn().mockResolvedValue({ imageUrl: uploaded.url })
    const deleteUploaded = vi.fn()
    const deletePrevious = vi.fn()

    await replaceStoredUpload({
      upload,
      persist,
      previous: {
        bucket: 'product-images',
        storagePath: 'products/product-1/old.png',
        url: 'https://cdn.example.com/old.png',
      },
      deleteUploadedObject: deleteUploaded,
      deletePreviousObject: deletePrevious,
      cleanupUploadedLabel: 'test:cleanup-uploaded',
      cleanupPreviousLabel: 'test:cleanup-previous',
    })

    expect(deletePrevious).toHaveBeenCalledWith('products/product-1/old.png')
    expect(deleteUploaded).not.toHaveBeenCalled()
  })

  it('skips cleanup for legacy URL-only records', async () => {
    const deleteObject = vi.fn()

    await cleanupStoredUpload({
      previous: { bucket: 'category-images', url: 'https://legacy.example.com/category.jpg', storagePath: null },
      deleteObject,
      label: 'test:cleanup-legacy',
    })

    expect(deleteObject).not.toHaveBeenCalled()
  })

  it('does not fail the business operation when cleanup fails', async () => {
    const deleteObject = vi.fn().mockRejectedValue(new Error('missing object'))

    await expect(
      cleanupStoredUpload({
        previous: { bucket: 'category-images', storagePath: 'categories/cat-1/missing.png' },
        deleteObject,
        label: 'test:cleanup-missing',
      }),
    ).resolves.toBeUndefined()
  })
})

describe('upload validation helpers', () => {
  const allowed = new Map([
    ['image/png', 'png'],
    ['application/pdf', 'pdf'],
  ])

  it('returns canonical metadata for valid upload files', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'Proof File.PNG', { type: 'image/png' })

    expect(validateUploadFileMetadata({
      file,
      maxBytes: 10,
      allowedContentTypes: allowed,
      createError: (message) => new Error(message),
    })).toEqual({
      contentType: 'image/png',
      extension: 'png',
      filename: 'Proof-File.png',
      size: 3,
    })
  })

  it('rejects invalid non-empty upload file types', () => {
    const file = new File([new Uint8Array([1])], 'bad.exe', { type: 'application/x-msdownload' })

    expect(() => validateUploadFileMetadata({
      file,
      maxBytes: 10,
      allowedContentTypes: allowed,
      createError: (message) => new Error(message),
    })).toThrow('File type is not supported')
  })

  it('normalizes unsafe filenames without changing the extension', () => {
    expect(sanitizeUploadFilename('  weird file --- name!!.pdf', 'pdf')).toBe('weird-file-name.pdf')
  })
})
