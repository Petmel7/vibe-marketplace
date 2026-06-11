import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before any imports that use it
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

// Mock all repositories
vi.mock('@/features/storefront/storefront.repository')
vi.mock('@/features/seller/seller.repository')
vi.mock('@/features/media/media.service')
vi.mock('@/features/store/store.repository', () => ({
  listStoresByOwnerId: vi.fn(),
}))
vi.mock('@/features/store/store.service', () => ({
  resolveSellerStoreContext: vi.fn(),
}))

// Mock the requireSeller guard
vi.mock('@/lib/auth/guards', () => ({
  requireSeller: vi.fn(),
}))

// Mock slugify utility so slug generation is deterministic in tests
vi.mock('@/lib/utils/slugify', () => ({
  generateSlug: vi.fn((name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100),
  ),
}))

import * as storefrontRepo from '@/features/storefront/storefront.repository'
import * as sellerRepo from '@/features/seller/seller.repository'
import * as mediaService from '@/features/media/media.service'
import * as storeRepo from '@/features/store/store.repository'
import * as storeService from '@/features/store/store.service'
import * as guards from '@/lib/auth/guards'
import {
  getOnboardingStatus,
  provisionStorefront,
  updateStoreSettings,
  checkSlugAvailability,
  uploadStorefrontAsset,
} from '@/features/storefront/storefront.service'
import {
  SellerNotVerifiedError,
  StoreProvisioningRequiredError,
  SlugAlreadyTakenError,
} from '@/lib/errors/seller'
import { SellerProfileNotFoundError } from '@/lib/errors/profile'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { StorefrontDto } from '@/features/storefront/storefront.dto'

const mockStorefrontRepo = vi.mocked(storefrontRepo)
const mockSellerRepo = vi.mocked(sellerRepo)
const mockMediaService = vi.mocked(mediaService)
const mockStoreRepo = vi.mocked(storeRepo)
const mockStoreService = vi.mocked(storeService)
const mockGuards = vi.mocked(guards)

const mockUser: SessionUser = {
  id: 'user-uuid-001',
  email: 'seller@example.com',
  roles: [],
}

function makeSellerProfile(overrides: Partial<{
  id: string
  userId: string
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED'
  businessName: string | null
  taxId: string | null
  createdAt: Date
  updatedAt: Date
}> = {}) {
  return {
    id: 'seller-uuid-001',
    userId: mockUser.id,
    verificationStatus: 'VERIFIED' as const,
    businessName: 'Test Shop',
    taxId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

function makeStoreRow(overrides: Partial<{
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
}> = {}) {
  return {
    id: 'store-uuid-001',
    ownerId: mockUser.id,
    name: 'Test Shop',
    slug: 'test-shop',
    description: null,
    logoUrl: null,
    bannerUrl: null,
    isActive: true,
    isPrimary: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // requireSeller does nothing by default (passes silently)
  mockGuards.requireSeller.mockReturnValue(undefined)
})

// ---------------------------------------------------------------------------
// provisionStorefront
// ---------------------------------------------------------------------------
describe('provisionStorefront', () => {
  it('creates a store for a verified seller', async () => {
    const storeRow = makeStoreRow()
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'VERIFIED' }))
    mockStoreRepo.listStoresByOwnerId.mockResolvedValue([])
    mockStorefrontRepo.checkSlugAvailable.mockResolvedValue(true)
    mockStorefrontRepo.createStore.mockResolvedValue(storeRow)

    const result = await provisionStorefront(mockUser, { name: 'Test Shop', slug: 'test-shop' })

    expect(mockStorefrontRepo.createStore).toHaveBeenCalledWith(
      mockUser.id,
      expect.objectContaining({ slug: 'test-shop' }),
    )
    expect(result).toMatchObject<Partial<StorefrontDto>>({
      userId: mockUser.id,
      name: 'Test Shop',
      slug: 'test-shop',
      isPrimary: true,
    })
  })

  it('throws SellerNotVerifiedError for an unverified seller', async () => {
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'PENDING' }))

    await expect(
      provisionStorefront(mockUser, { name: 'Test Shop', slug: 'test-shop' }),
    ).rejects.toThrow(SellerNotVerifiedError)

    expect(mockStorefrontRepo.createStore).not.toHaveBeenCalled()
  })

  it('allows a verified seller to provision an additional store', async () => {
    const existingStore = makeStoreRow()
    const secondStore = makeStoreRow({
      id: 'store-uuid-002',
      slug: 'test-shop-2',
      isPrimary: false,
    })
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'VERIFIED' }))
    mockStoreRepo.listStoresByOwnerId.mockResolvedValue([existingStore])
    mockStorefrontRepo.checkSlugAvailable.mockResolvedValue(true)
    mockStorefrontRepo.createStore.mockResolvedValue(secondStore)

    const result = await provisionStorefront(mockUser, { name: 'Test Shop 2', slug: 'test-shop-2' })

    expect(mockStorefrontRepo.createStore).toHaveBeenCalledWith(
      mockUser.id,
      expect.objectContaining({
        slug: 'test-shop-2',
        isPrimary: false,
      }),
    )
    expect(result.isPrimary).toBe(false)
  })

  it('auto-generates slug from name when no slug is provided', async () => {
    const storeRow = makeStoreRow({ slug: 'my-cool-store' })
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'VERIFIED' }))
    mockStoreRepo.listStoresByOwnerId.mockResolvedValue([])
    mockStorefrontRepo.checkSlugAvailable.mockResolvedValue(true)
    mockStorefrontRepo.createStore.mockResolvedValue(storeRow)

    await provisionStorefront(mockUser, { name: 'My Cool Store' })

    expect(mockStorefrontRepo.createStore).toHaveBeenCalledWith(
      mockUser.id,
      expect.objectContaining({ slug: 'my-cool-store' }),
    )
  })

  it('throws InvalidStoreSlugError when a provided slug is already taken', async () => {
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'VERIFIED' }))
    mockStoreRepo.listStoresByOwnerId.mockResolvedValue([])
    mockStorefrontRepo.checkSlugAvailable.mockResolvedValue(false)

    await expect(
      provisionStorefront(mockUser, { name: 'Test Shop', slug: 'taken-slug' }),
    ).rejects.toThrow(SlugAlreadyTakenError)

    expect(mockStorefrontRepo.createStore).not.toHaveBeenCalled()
  })

  it('sets isPrimary true on the first store', async () => {
    const storeRow = makeStoreRow({ isPrimary: true })
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'VERIFIED' }))
    mockStoreRepo.listStoresByOwnerId.mockResolvedValue([])
    mockStorefrontRepo.checkSlugAvailable.mockResolvedValue(true)
    mockStorefrontRepo.createStore.mockResolvedValue(storeRow)

    const result = await provisionStorefront(mockUser, { name: 'Test Shop', slug: 'test-shop' })

    expect(result.isPrimary).toBe(true)
  })

  it('normalizes provided slug candidates before persisting', async () => {
    const storeRow = makeStoreRow({ slug: 'test-shop' })
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'VERIFIED' }))
    mockStoreRepo.listStoresByOwnerId.mockResolvedValue([])
    mockStorefrontRepo.checkSlugAvailable.mockResolvedValue(true)
    mockStorefrontRepo.createStore.mockResolvedValue(storeRow)

    await provisionStorefront(mockUser, { name: 'Test Shop', slug: ' Test Shop!! ' })

    expect(mockStorefrontRepo.createStore).toHaveBeenCalledWith(
      mockUser.id,
      expect.objectContaining({ slug: 'test-shop' }),
    )
  })
})

// ---------------------------------------------------------------------------
// getOnboardingStatus
// ---------------------------------------------------------------------------
describe('getOnboardingStatus', () => {
  it('isFullyProvisioned is false when no store exists', async () => {
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'VERIFIED' }))
    mockStoreRepo.listStoresByOwnerId.mockResolvedValue([])

    const result = await getOnboardingStatus(mockUser)

    expect(result.isFullyProvisioned).toBe(false)
    expect(result.hasStore).toBe(false)
    expect(result.store).toBeNull()
  })

  it('isFullyProvisioned is true when seller is verified and has a store', async () => {
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'VERIFIED' }))
    mockStoreRepo.listStoresByOwnerId.mockResolvedValue([makeStoreRow()])

    const result = await getOnboardingStatus(mockUser)

    expect(result.isFullyProvisioned).toBe(true)
    expect(result.isVerified).toBe(true)
    expect(result.hasStore).toBe(true)
    expect(result.store).not.toBeNull()
  })

  it('isVerified is false when verificationStatus is PENDING', async () => {
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'PENDING' }))
    mockStoreRepo.listStoresByOwnerId.mockResolvedValue([])

    const result = await getOnboardingStatus(mockUser)

    expect(result.isVerified).toBe(false)
    expect(result.verificationStatus).toBe('PENDING')
  })

  it('throws SellerProfileNotFoundError when seller profile is missing', async () => {
    mockSellerRepo.findSellerByUserId.mockResolvedValue(null)

    await expect(getOnboardingStatus(mockUser)).rejects.toThrow(SellerProfileNotFoundError)
  })
})

// ---------------------------------------------------------------------------
// checkSlugAvailability
// ---------------------------------------------------------------------------
describe('checkSlugAvailability', () => {
  it('returns available true for a free slug', async () => {
    mockStorefrontRepo.checkSlugAvailable.mockResolvedValue(true)

    const result = await checkSlugAvailability('free-slug')

    expect(result.available).toBe(true)
    expect(result.suggestion).toBeNull()
  })

  it('returns available false and a suggestion for a taken slug', async () => {
    mockStorefrontRepo.checkSlugAvailable
      .mockResolvedValueOnce(false)   // primary slug is taken
      .mockResolvedValueOnce(true)    // suggestion is available

    const result = await checkSlugAvailability('Taken Slug')

    expect(result.available).toBe(false)
    expect(result.suggestion).toBe('taken-slug-2')
  })
})

// ---------------------------------------------------------------------------
// updateStoreSettings
// ---------------------------------------------------------------------------
describe('updateStoreSettings', () => {
  it('throws StoreProvisioningRequiredError when no primary store exists', async () => {
    mockStoreService.resolveSellerStoreContext.mockRejectedValue(new StoreProvisioningRequiredError())

    await expect(
      updateStoreSettings(mockUser, { name: 'New Name' }),
    ).rejects.toThrow(StoreProvisioningRequiredError)

    expect(mockStorefrontRepo.updateStoreSettings).not.toHaveBeenCalled()
  })

  it('updates and returns the store when it exists', async () => {
    const original = makeStoreRow()
    const updated = makeStoreRow({ name: 'New Name' })
    mockStoreService.resolveSellerStoreContext.mockResolvedValue(original as never)
    mockStorefrontRepo.updateStoreSettings.mockResolvedValue(updated)

    const result = await updateStoreSettings(mockUser, { name: 'New Name' })

    expect(mockStorefrontRepo.updateStoreSettings).toHaveBeenCalledWith(original.id, { name: 'New Name' })
    expect(result.name).toBe('New Name')
  })
})

describe('uploadStorefrontAsset', () => {
  it('uploads the store logo and persists the returned URL', async () => {
    const original = makeStoreRow()
    const updated = makeStoreRow({ logoUrl: 'https://cdn.example.com/logo.png' })
    const file = new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], 'logo.png', { type: 'image/png' })

    mockStoreService.resolveSellerStoreContext.mockResolvedValue(original as never)
    mockMediaService.uploadStoreAssetBinary.mockResolvedValue({
      bucket: 'store-assets',
      url: 'https://cdn.example.com/logo.png',
      storagePath: 'stores/store-uuid-001/logo/hash.png',
      contentType: 'image/png',
      size: 4,
    })
    mockStorefrontRepo.updateStoreSettings.mockResolvedValue(updated)

    const result = await uploadStorefrontAsset(mockUser, 'logo', file)

    expect(mockMediaService.uploadStoreAssetBinary).toHaveBeenCalledWith({
      file,
      kind: 'logo',
      storeId: original.id,
    })
    expect(mockStorefrontRepo.updateStoreSettings).toHaveBeenCalledWith(original.id, {
      logoUrl: 'https://cdn.example.com/logo.png',
    })
    expect(result.asset.storagePath).toBe('stores/store-uuid-001/logo/hash.png')
    expect(result.store.logoUrl).toBe('https://cdn.example.com/logo.png')
  })
})
