/**
 * Data Transfer Objects for the Cart feature.
 *
 * Decimal monetary values are serialized as strings to avoid floating-point
 * precision loss in JSON transport.
 */

export interface CartVariantDto {
  id: string
  sku: string
  size: string | null
  color: string | null
  /** Variant-level price override. Null means "use base product price". */
  price: string | null
  stock: number
  product: {
    id: string
    name: string
    /** Base product price, serialized as string. */
    price: string
    imageUrl: string | null
  }
}

export interface CartItemDto {
  id: string
  variantId: string
  quantity: number
  /** Effective unit price (variant override if set, else product base price). */
  unitPrice: string
  /** quantity × unitPrice, serialized as string. */
  lineTotal: string
  variant: CartVariantDto
}

export interface CartDto {
  id: string
  items: CartItemDto[]
  /** Sum of all line totals, serialized as string. */
  totalAmount: string
  /** Total number of individual units across all line items. */
  itemCount: number
}
