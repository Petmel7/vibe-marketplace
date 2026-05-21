import { generateSlug } from '@/lib/utils/slugify'

const STORE_ASSET_MAX_BYTES = 5 * 1024 * 1024
const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024

export function generateStoreSlugDraft(name: string) {
  return generateSlug(name)
}

function normalizeSkuToken(value: string) {
  return value
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

export function generateBaseSkuDraft(name: string, storeSlug: string) {
  const storePart = normalizeSkuToken(storeSlug).slice(0, 12)
  const productPart = normalizeSkuToken(generateSlug(name)).slice(0, 32)
  return normalizeSkuToken([storePart, productPart].filter(Boolean).join('-'))
}

export function generateVariantSkuDraft(
  baseSku: string,
  variant: { size?: string | null; color?: string | null },
  index: number,
) {
  const fragments = [normalizeSkuToken(baseSku)]

  if (variant.size) {
    fragments.push(normalizeSkuToken(variant.size).slice(0, 12))
  }

  if (variant.color) {
    fragments.push(normalizeSkuToken(variant.color).slice(0, 12))
  }

  fragments.push(String(index + 1).padStart(2, '0'))

  return normalizeSkuToken(fragments.filter(Boolean).join('-'))
}

type FileValidationOptions = {
  maxBytes: number
  allowSvg: boolean
}

function getExtension(name: string) {
  const extension = name.split('.').pop()
  return extension ? extension.toLowerCase() : ''
}

export function validateImageFile(
  file: File,
  options: FileValidationOptions,
) {
  const allowedExtensions = options.allowSvg
    ? ['jpg', 'jpeg', 'png', 'webp', 'svg']
    : ['jpg', 'jpeg', 'png', 'webp']

  if (!allowedExtensions.includes(getExtension(file.name))) {
    return `Only ${allowedExtensions.join(', ').toUpperCase()} files are supported.`
  }

  if (file.size > options.maxBytes) {
    return `File exceeds the ${Math.floor(options.maxBytes / 1024 / 1024)}MB limit.`
  }

  return null
}

export function validateStoreAssetFile(file: File) {
  return validateImageFile(file, {
    maxBytes: STORE_ASSET_MAX_BYTES,
    allowSvg: true,
  })
}

export function validateProductImageFile(file: File) {
  return validateImageFile(file, {
    maxBytes: PRODUCT_IMAGE_MAX_BYTES,
    allowSvg: false,
  })
}

export function formatCategoryOptionLabel(category: {
  name: string
  level: number
}) {
  const prefix = category.level > 1 ? `${'— '.repeat(category.level - 1)}` : ''
  return `${prefix}${category.name}`
}
