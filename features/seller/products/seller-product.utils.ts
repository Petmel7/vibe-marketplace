import { generateSlug } from '@/lib/utils/slugify'

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

export function generateBaseSku(name: string, storeSlug: string) {
  const storePart = normalizeSkuToken(storeSlug).slice(0, 12)
  const productPart = normalizeSkuToken(generateSlug(name)).slice(0, 32)
  return normalizeSkuToken([storePart, productPart].filter(Boolean).join('-'))
}

export function generateVariantSku(
  baseSku: string,
  variant: { size?: string | null; color?: string | null },
  index: number,
) {
  const fragments = [baseSku]

  if (variant.size) {
    fragments.push(normalizeSkuToken(variant.size).slice(0, 12))
  }

  if (variant.color) {
    fragments.push(normalizeSkuToken(variant.color).slice(0, 12))
  }

  fragments.push(String(index + 1).padStart(2, '0'))

  return normalizeSkuToken(fragments.filter(Boolean).join('-'))
}
