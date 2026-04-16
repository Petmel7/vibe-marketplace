export interface ViewedProductDto {
  id: string
  productId: string
  name: string
  /** Product base price, serialized as string to avoid floating-point loss. */
  price: string
  imageUrl: string | null
  viewedAt: string
}

export interface ViewedListDto {
  items: ViewedProductDto[]
}
