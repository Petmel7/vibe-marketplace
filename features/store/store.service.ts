import {
  InvalidStoreContextError,
  StoreNotFoundError,
  SlugConflictError,
} from '@/lib/errors/seller'
import { assertSellerOwnsStore, requireVerifiedSeller } from '@/lib/auth/sellerGuards'
import { requireSeller } from '@/lib/auth/guards'
import { findSellerByUserId } from '@/features/seller/seller.repository'
import {
  findOwnedStoreById,
  findStoreBySlug,
  listStoresByOwnerId,
  updateStore,
  setStoreActive,
} from './store.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { StoreDto } from './store.dto'
import type { UpdateStoreInput } from './store.schema'

export async function assertStoreOwnership(
  userId: string,
  storeId: string,
  options?: { requireActive?: boolean },
): Promise<StoreDto> {
  const store = await findOwnedStoreById(userId, storeId)
  if (!store) {
    throw new StoreNotFoundError()
  }

  if (options?.requireActive && !store.isActive) {
    throw new InvalidStoreContextError('Store must be active for this operation')
  }

  return store
}

export async function resolveSellerStoreContext(
  user: SessionUser,
  storeId?: string,
  options?: { requireActive?: boolean },
): Promise<StoreDto> {
  requireSeller(user)

  if (storeId) {
    return assertStoreOwnership(user.id, storeId, options)
  }

  const stores = await listStoresByOwnerId(user.id)
  if (stores.length === 0) {
    throw new StoreNotFoundError()
  }

  if (stores.length > 1) {
    throw new InvalidStoreContextError()
  }

  const store = stores[0]
  if (options?.requireActive && !store.isActive) {
    throw new InvalidStoreContextError('Store must be active for this operation')
  }

  return store
}

export async function getMyStore(user: SessionUser, storeId?: string): Promise<StoreDto> {
  return resolveSellerStoreContext(user, storeId)
}

export async function updateMyStore(
  user: SessionUser,
  data: UpdateStoreInput,
  storeId?: string,
): Promise<StoreDto> {
  const store = await resolveSellerStoreContext(user, storeId)
  assertSellerOwnsStore(user, store)

  if (data.slug && data.slug !== store.slug) {
    const existing = await findStoreBySlug(data.slug)
    if (existing) throw new SlugConflictError()
  }

  return updateStore(store.id, data)
}

export async function activateStore(user: SessionUser, storeId?: string): Promise<StoreDto> {
  const store = await resolveSellerStoreContext(user, storeId)
  assertSellerOwnsStore(user, store)

  const sellerProfile = await findSellerByUserId(user.id)
  if (!sellerProfile) throw new StoreNotFoundError('Seller profile not found')
  requireVerifiedSeller(sellerProfile)

  return setStoreActive(store.id, true)
}

export async function deactivateStore(user: SessionUser, storeId?: string): Promise<StoreDto> {
  const store = await resolveSellerStoreContext(user, storeId)
  assertSellerOwnsStore(user, store)

  return setStoreActive(store.id, false)
}
