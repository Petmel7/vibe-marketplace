/**
 * Data Transfer Objects for the Wishlist feature.
 *
 * WishlistItemDto embeds a product snapshot (name, price, imageUrl) so the
 * client receives everything it needs to render a wishlist in one request.
 * price is serialized as string to avoid floating-point precision loss.
 */

export interface WishlistItemDto {
  id: string
  productId: string
  name: string
  /** Product base price, serialized as string. */
  price: string
  imageUrl: string | null
  addedAt: string
}

export interface WishlistDto {
  id: string
  userId: string
  items: WishlistItemDto[]
}
