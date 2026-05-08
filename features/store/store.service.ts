import { StoreNotFoundError, SlugConflictError } from '@/lib/errors/seller'
import { assertSellerOwnsStore, requireVerifiedSeller } from '@/lib/auth/sellerGuards'
import { requireSeller } from '@/lib/auth/guards'
import { findSellerByUserId } from '@/features/seller/seller.repository'
import {
  findStoreByUserId,
  findStoreBySlug,
  updateStore,
  setStoreActive,
} from './store.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { StoreDto } from './store.dto'
import type { UpdateStoreInput } from './store.schema'

export async function getMyStore(user: SessionUser): Promise<StoreDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()
  return store
}

export async function updateMyStore(user: SessionUser, data: UpdateStoreInput): Promise<StoreDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()
  assertSellerOwnsStore(user, store)

  if (data.slug && data.slug !== store.slug) {
    const existing = await findStoreBySlug(data.slug)
    if (existing) throw new SlugConflictError()
  }

  return updateStore(store.id, data)
}

export async function activateStore(user: SessionUser): Promise<StoreDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()
  assertSellerOwnsStore(user, store)

  const sellerProfile = await findSellerByUserId(user.id)
  if (!sellerProfile) throw new StoreNotFoundError('Seller profile not found')
  requireVerifiedSeller(sellerProfile)

  return setStoreActive(store.id, true)
}

export async function deactivateStore(user: SessionUser): Promise<StoreDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()
  assertSellerOwnsStore(user, store)

  return setStoreActive(store.id, false)
}
