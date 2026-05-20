import { requireSeller } from '@/lib/auth/guards'
import { SellerProfileNotFoundError } from '@/lib/errors/profile'
import {
  StoreAlreadyExistsError,
  SellerNotVerifiedError,
  StoreProvisioningRequiredError,
  InvalidStoreSlugError,
  SlugAlreadyTakenError,
} from '@/lib/errors/seller'
import { generateSlug } from '@/lib/utils/slugify'
import { uploadStoreAssetBinary } from '@/features/media/media.service'
import type { StoreAssetKind } from '@/features/media/media.dto'
import { findSellerByUserId } from '@/features/seller/seller.repository'
import {
  findStoreByUserId,
  findPrimaryStoreByUserId,
  createStore,
  updateStoreSettings as repoUpdateStoreSettings,
  checkSlugAvailable,
} from './storefront.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  StorefrontDto,
  OnboardingStatusDto,
  SlugAvailabilityDto,
  StorefrontAssetUploadDto,
} from './storefront.dto'
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

function normalizeStoreSlug(value: string) {
  const slug = generateSlug(value)
  if (!slug || slug.length < 2) {
    throw new InvalidStoreSlugError('Store slug must contain at least 2 alphanumeric characters')
  }
  return slug
}

async function resolveUniqueStoreSlug(params: {
  name: string
  requestedSlug?: string
}) {
  const baseSlug = normalizeStoreSlug(params.requestedSlug ?? params.name)
  const available = await checkSlugAvailable(baseSlug)

  if (available) {
    return baseSlug
  }

  if (params.requestedSlug) {
    throw new SlugAlreadyTakenError(`Slug "${baseSlug}" is already taken`)
  }

  for (let index = 2; index <= 99; index += 1) {
    const candidate = normalizeStoreSlug(`${baseSlug}-${index}`)
    const free = await checkSlugAvailable(candidate)
    if (free) {
      return candidate
    }
  }

  throw new SlugAlreadyTakenError(`Could not generate a unique slug for "${params.name}"`)
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

  const resolvedSlug = await resolveUniqueStoreSlug({
    name: data.name,
    requestedSlug: data.slug,
  })

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
  const normalized = normalizeStoreSlug(slug)
  const available = await checkSlugAvailable(normalized)

  if (available) {
    return { available: true, suggestion: null }
  }

  for (let index = 2; index <= 99; index += 1) {
    const suggestion = normalizeStoreSlug(`${normalized}-${index}`)
    const suggestionAvailable = await checkSlugAvailable(suggestion)
    if (suggestionAvailable) {
      return {
        available: false,
        suggestion,
      }
    }
  }

  return { available: false, suggestion: null }
}

export async function uploadStorefrontAsset(
  user: SessionUser,
  kind: StoreAssetKind,
  file: File,
): Promise<StorefrontAssetUploadDto> {
  requireSeller(user)

  const store = await findPrimaryStoreByUserId(user.id)
  if (!store) throw new StoreProvisioningRequiredError()

  const asset = await uploadStoreAssetBinary({
    storeId: store.id,
    kind,
    file,
  })

  const updatedStore = await repoUpdateStoreSettings(store.id, {
    ...(kind === 'logo' ? { logoUrl: asset.url } : {}),
    ...(kind === 'banner' ? { bannerUrl: asset.url } : {}),
  })

  return {
    asset,
    store: toStorefrontDto(updatedStore),
  }
}
