export const PRODUCT_NAME_MIN_LENGTH = 1
export const PRODUCT_NAME_MODERATION_MIN_LENGTH = 3
export const PRODUCT_NAME_MAX_LENGTH = 140
export const PRODUCT_DESCRIPTION_MODERATION_MIN_LENGTH = 30
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 2000
export const PRODUCT_PRICE_MIN = 0.01
export const PRODUCT_PRICE_MAX = 999999.99
export const PRODUCT_IMAGE_LIMIT = 10
export const PRODUCT_VARIANT_LIMIT = 50
export const PRODUCT_VARIANT_STOCK_MAX = 99999
export const PRODUCT_VARIANT_COLOR_MAX_LENGTH = 50
export const PRODUCT_SKU_MAX_LENGTH = 100
export const PRODUCT_IMAGE_STORAGE_PATH_MAX_LENGTH = 512
export const PRODUCT_IMAGE_ALT_TEXT_MAX_LENGTH = 200

const PRODUCT_REQUIRED_SIZE_CATEGORY_SLUGS = new Set(['clothing-shoes'])

export function parseMoneyValue(value: string | null | undefined): number | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function isMoneyValueInRange(value: string | null | undefined): boolean {
  const parsed = parseMoneyValue(value)
  return parsed !== null && parsed >= PRODUCT_PRICE_MIN && parsed <= PRODUCT_PRICE_MAX
}

export function normalizeVariantIdentityColor(color: string | null | undefined) {
  return color?.trim().toUpperCase() ?? ''
}

export function createVariantCombinationKey(input: {
  size?: string | null
  color?: string | null
}) {
  return `${input.size?.trim() ?? ''}::${normalizeVariantIdentityColor(input.color)}`
}

export function categoryRequiresSize(categoryPathSlugs: readonly string[]) {
  return categoryPathSlugs.some((slug) => PRODUCT_REQUIRED_SIZE_CATEGORY_SLUGS.has(slug))
}
