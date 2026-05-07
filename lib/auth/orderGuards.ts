import type { SessionUser } from '@/features/auth/auth.dto'
import { OrderAccessError } from '@/lib/errors/orders'

export function assertOrderOwner(user: SessionUser, order: { userId: string }): void {
  if (user.id !== order.userId) throw new OrderAccessError()
}

export function assertSellerStoreAccess(user: SessionUser, storeOwnerId: string): void {
  if (user.id !== storeOwnerId) throw new OrderAccessError('You do not own this store')
}
