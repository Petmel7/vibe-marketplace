import { createHash } from 'node:crypto'
import { InvalidImageFileError } from '@/lib/errors/seller'
import type { UploadedMediaAssetDto, StoreAssetKind } from './media.dto'
import { PRODUCT_IMAGE_BUCKET, STORE_ASSET_BUCKET } from './media.dto'
import { removePublicAsset, uploadPublicAsset } from './media.repository'

const STORE_ASSET_MAX_BYTES = 5 * 1024 * 1024
const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024

type ValidatedImage = {
  bytes: Uint8Array
  contentType: string
  extension: string
  size: number
}

function sanitizeSvgContent(content: string) {
  return content.replace(/^\uFEFF/, '').trim().toLowerCase()
}

function detectImageFormat(bytes: Uint8Array, allowSvg: boolean): { contentType: string; extension: string } {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: 'image/jpeg', extension: 'jpg' }
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { contentType: 'image/png', extension: 'png' }
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return { contentType: 'image/webp', extension: 'webp' }
  }

  if (allowSvg) {
    const text = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 512)))
    const normalized = sanitizeSvgContent(text)
    if (normalized.startsWith('<svg') || (normalized.startsWith('<?xml') && normalized.includes('<svg'))) {
      return { contentType: 'image/svg+xml', extension: 'svg' }
    }
  }

  throw new InvalidImageFileError('Only JPG, PNG, WEBP, and trusted SVG store assets are supported')
}

async function validateImageFile(
  file: File,
  options: { maxBytes: number; allowSvg: boolean },
): Promise<ValidatedImage> {
  if (!(file instanceof File)) {
    throw new InvalidImageFileError('A valid image file is required')
  }

  if (file.size <= 0) {
    throw new InvalidImageFileError('Image file cannot be empty')
  }

  if (file.size > options.maxBytes) {
    throw new InvalidImageFileError(`Image file exceeds the ${Math.floor(options.maxBytes / 1024 / 1024)}MB limit`)
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const detected = detectImageFormat(bytes, options.allowSvg)

  return {
    bytes,
    contentType: detected.contentType,
    extension: detected.extension,
    size: file.size,
  }
}

function buildStoragePath(prefix: string, bytes: Uint8Array, extension: string) {
  const digest = createHash('sha256').update(bytes).digest('hex')
  return `${prefix}/${digest}.${extension}`
}

export async function uploadStoreAssetBinary(params: {
  storeId: string
  kind: StoreAssetKind
  file: File
}): Promise<UploadedMediaAssetDto> {
  const validated = await validateImageFile(params.file, {
    maxBytes: STORE_ASSET_MAX_BYTES,
    allowSvg: true,
  })

  const storagePath = buildStoragePath(
    `stores/${params.storeId}/${params.kind}`,
    validated.bytes,
    validated.extension,
  )

  const uploaded = await uploadPublicAsset({
    bucket: STORE_ASSET_BUCKET,
    path: storagePath,
    body: validated.bytes,
    contentType: validated.contentType,
  })

  return {
    bucket: STORE_ASSET_BUCKET,
    url: uploaded.url,
    storagePath: uploaded.storagePath,
    contentType: validated.contentType,
    size: validated.size,
  }
}

export async function uploadProductImageBinary(params: {
  productId: string
  file: File
}): Promise<UploadedMediaAssetDto> {
  const validated = await validateImageFile(params.file, {
    maxBytes: PRODUCT_IMAGE_MAX_BYTES,
    allowSvg: false,
  })

  const storagePath = buildStoragePath(
    `products/${params.productId}`,
    validated.bytes,
    validated.extension,
  )

  const uploaded = await uploadPublicAsset({
    bucket: PRODUCT_IMAGE_BUCKET,
    path: storagePath,
    body: validated.bytes,
    contentType: validated.contentType,
  })

  return {
    bucket: PRODUCT_IMAGE_BUCKET,
    url: uploaded.url,
    storagePath: uploaded.storagePath,
    contentType: validated.contentType,
    size: validated.size,
  }
}

export async function deleteProductImageBinary(storagePath: string): Promise<void> {
  await removePublicAsset(PRODUCT_IMAGE_BUCKET, storagePath)
}

export async function deleteStoreAssetBinary(storagePath: string): Promise<void> {
  await removePublicAsset(STORE_ASSET_BUCKET, storagePath)
}
