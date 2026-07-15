export const ALLOWED_PRODUCT_SIZES = [
  'XXS',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'ONE SIZE',
] as const

export type AllowedProductSize = (typeof ALLOWED_PRODUCT_SIZES)[number]

export const PRODUCT_SIZE_OPTIONS: Array<{
  value: AllowedProductSize
  label: string
}> = ALLOWED_PRODUCT_SIZES.map((size) => ({
  value: size,
  label: size,
}))

export function isAllowedProductSize(value: string | null | undefined): value is AllowedProductSize {
  if (!value) {
    return false
  }

  return (ALLOWED_PRODUCT_SIZES as readonly string[]).includes(value)
}
