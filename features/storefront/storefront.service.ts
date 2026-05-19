import { requireSeller } from '@/lib/auth/guards'
import { SellerProfileNotFoundError } from '@/lib/errors/profile'
import {
  StoreAlreadyExistsError,
  SellerNotVerifiedError,
  StoreProvisioningRequiredError,
  InvalidStoreSlugError,
} from '@/lib/errors/seller'
import { generateSlug } from '@/lib/utils/slugify'
import { findSellerByUserId } from '@/features/seller/seller.repository'
import {
  findStoreByUserId,
  findPrimaryStoreByUserId,
  findStoreBySlug,
  createStore,
  updateStoreSettings as repoUpdateStoreSettings,
  checkSlugAvailable,
} from './storefront.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { StorefrontDto, OnboardingStatusDto, SlugAvailabilityDto } from './storefront.dto'
import type { CreateStoreInput, UpdateStoreSettingsInput } from './storefront.schema'
import { SellerVerificationStatus } from '@/app/generated/prisma/client'

// Maps a raw store row (ownerId) to the public DTO shape (userId)
function toStorefrontDto(store: {
  id: string
  ownerId: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  isActive: boolean
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}): StorefrontDto {
  return {
    id: store.id,
    userId: store.ownerId,
    name: store.name,
    slug: store.slug,
    description: store.description,
    logoUrl: store.logoUrl,
    bannerUrl: store.bannerUrl,
    isActive: store.isActive,
    isPrimary: store.isPrimary,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  }
}

export async function getOnboardingStatus(user: SessionUser): Promise<OnboardingStatusDto> {
  requireSeller(user)

  const sellerProfile = await findSellerByUserId(user.id)
  if (!sellerProfile) throw new SellerProfileNotFoundError()

  const store = await findStoreByUserId(user.id)

  const isVerified = sellerProfile.verificationStatus === SellerVerificationStatus.VERIFIED
  const hasStore = store !== null

  return {
    isVerified,
    hasStore,
    isFullyProvisioned: isVerified && hasStore,
    verificationStatus: sellerProfile.verificationStatus,
    store: store ? toStorefrontDto(store) : null,
  }
}

export async function provisionStorefront(
  user: SessionUser,
  data: CreateStoreInput,
): Promise<StorefrontDto> {
  requireSeller(user)

  const sellerProfile = await findSellerByUserId(user.id)
  if (!sellerProfile) throw new SellerProfileNotFoundError()
  if (sellerProfile.verificationStatus !== SellerVerificationStatus.VERIFIED) {
    throw new SellerNotVerifiedError()
  }

  const existingStore = await findStoreByUserId(user.id)
  if (existingStore) throw new StoreAlreadyExistsError()

  let resolvedSlug: string

  if (data.slug) {
    const available = await checkSlugAvailable(data.slug)
    if (!available) throw new InvalidStoreSlugError(`Slug "${data.slug}" is already taken`)
    resolvedSlug = data.slug
  } else {
    resolvedSlug = generateSlug(data.name)
    const available = await checkSlugAvailable(resolvedSlug)
    if (!available) {
      // Append a random 4-digit number to make it unique
      const suffix = Math.floor(1000 + Math.random() * 9000)
      resolvedSlug = `${resolvedSlug}-${suffix}`.slice(0, 100)
      const stillAvailable = await checkSlugAvailable(resolvedSlug)
      if (!stillAvailable) {
        throw new InvalidStoreSlugError(
          `Could not generate a unique slug for "${data.name}". Please provide a custom slug.`,
        )
      }
    }
  }

  const store = await createStore(user.id, { ...data, slug: resolvedSlug })
  return toStorefrontDto(store)
}

export async function updateStoreSettings(
  user: SessionUser,
  data: UpdateStoreSettingsInput,
): Promise<StorefrontDto> {
  requireSeller(user)

  const store = await findPrimaryStoreByUserId(user.id)
  if (!store) throw new StoreProvisioningRequiredError()

  const updated = await repoUpdateStoreSettings(store.id, data)
  return toStorefrontDto(updated)
}

export async function checkSlugAvailability(slug: string): Promise<SlugAvailabilityDto> {
  const available = await checkSlugAvailable(slug)

  if (available) {
    return { available: true, suggestion: null }
  }

  // Generate a suggestion by appending a random 4-digit number
  const suffix = Math.floor(1000 + Math.random() * 9000)
  const suggestion = `${slug}-${suffix}`.slice(0, 100)
  const suggestionAvailable = await checkSlugAvailable(suggestion)

  return {
    available: false,
    suggestion: suggestionAvailable ? suggestion : null,
  }
}
