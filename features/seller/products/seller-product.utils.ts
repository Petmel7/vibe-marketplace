import { generateSlug } from '@/lib/utils/slugify'

const PRODUCT_SKU_PREFIX = 'PRD'
const VARIANT_SKU_PREFIX = 'VAR'
const SKU_FALLBACK_TOKEN = 'ITEM'
const SKU_UNIQUE_TAIL_LENGTH = 8

function normalizeSkuToken(value: string) {
  return value
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

export function normalizeSku(value: string) {
  return normalizeSkuToken(value)
}

function buildReadableSkuToken(value: string, maxLength: number) {
  return normalizeSkuToken(generateSlug(value)).slice(0, maxLength) || SKU_FALLBACK_TOKEN
}

function buildUniqueSkuTail() {
  return crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, SKU_UNIQUE_TAIL_LENGTH)
}

function getVariantReadableBaseToken(baseSku: string) {
  const normalizedBaseSku = normalizeSku(baseSku)

  if (!normalizedBaseSku) {
    return SKU_FALLBACK_TOKEN
  }

  return normalizedBaseSku
    .replace(/^PRD-/, '')
    .replace(/^VAR-/, '')
    .split('-')
    .filter(Boolean)
    .slice(0, 2)
    .join('-') || SKU_FALLBACK_TOKEN
}

export function generateBaseSku(name: string, _storeSlug: string) {
  const productPart = buildReadableSkuToken(name, 24)
  return normalizeSkuToken(`${PRODUCT_SKU_PREFIX}-${productPart}-${buildUniqueSkuTail()}`)
}

export function generateVariantSku(
  baseSku: string,
  variant: { size?: string | null; color?: string | null },
  _index: number,
) {
  const fragments = [VARIANT_SKU_PREFIX, getVariantReadableBaseToken(baseSku)]

  if (variant.size) {
    fragments.push(normalizeSkuToken(variant.size).slice(0, 12))
  }

  if (variant.color) {
    fragments.push(normalizeSkuToken(variant.color).slice(0, 12))
  }

  fragments.push(buildUniqueSkuTail())

  return normalizeSkuToken(fragments.filter(Boolean).join('-'))
}
