interface FormatPriceOptions {
  withCurrency?: boolean
}

function toNumber(value: string | number): number {
  return typeof value === 'number' ? value : Number(value)
}

export function formatPrice(
  value: string | number,
  options: FormatPriceOptions = {}
): string {
  const { withCurrency = true } = options
  const formatted = toNumber(value).toLocaleString('uk-UA')

  return withCurrency ? `${formatted} ₴` : formatted
}
