import { StoreOwnershipError, ProductOwnershipError, UnverifiedSellerError } from '@/lib/errors/seller'
import type { SessionUser } from '@/features/auth/auth.dto'

export function assertSellerOwnsStore(user: SessionUser, store: { ownerId: string }): void {
  if (store.ownerId !== user.id) throw new StoreOwnershipError()
}

export function assertSellerOwnsProduct(product: { storeId: string }, storeId: string): void {
  if (product.storeId !== storeId) throw new ProductOwnershipError()
}

export function requireVerifiedSeller(sellerProfile: { verificationStatus: string }): void {
  if (sellerProfile.verificationStatus !== 'VERIFIED') throw new UnverifiedSellerError()
}
