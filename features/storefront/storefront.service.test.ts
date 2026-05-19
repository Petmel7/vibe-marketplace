import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before any imports that use it
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

// Mock all repositories
vi.mock('@/features/storefront/storefront.repository')
vi.mock('@/features/seller/seller.repository')

// Mock the requireSeller guard
vi.mock('@/lib/auth/guards', () => ({
  requireSeller: vi.fn(),
}))

// Mock slugify utility so slug generation is deterministic in tests
vi.mock('@/lib/utils/slugify', () => ({
  generateSlug: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
}))

import * as storefrontRepo from '@/features/storefront/storefront.repository'
import * as sellerRepo from '@/features/seller/seller.repository'
import * as guards from '@/lib/auth/guards'
import {
  getOnboardingStatus,
  provisionStorefront,
  updateStoreSettings,
  checkSlugAvailability,
} from '@/features/storefront/storefront.service'
import {
  StoreAlreadyExistsError,
  SellerNotVerifiedError,
  StoreProvisioningRequiredError,
  InvalidStoreSlugError,
} from '@/lib/errors/seller'
import { SellerProfileNotFoundError } from '@/lib/errors/profile'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { StorefrontDto } from '@/features/storefront/storefront.dto'

const mockStorefrontRepo = vi.mocked(storefrontRepo)
const mockSellerRepo = vi.mocked(sellerRepo)
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
    mockStorefrontRepo.findStoreByUserId.mockResolvedValue(null)
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

  it('throws StoreAlreadyExistsError when a store already exists', async () => {
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'VERIFIED' }))
    mockStorefrontRepo.findStoreByUserId.mockResolvedValue(makeStoreRow())

    await expect(
      provisionStorefront(mockUser, { name: 'Test Shop', slug: 'test-shop' }),
    ).rejects.toThrow(StoreAlreadyExistsError)

    expect(mockStorefrontRepo.createStore).not.toHaveBeenCalled()
  })

  it('auto-generates slug from name when no slug is provided', async () => {
    const storeRow = makeStoreRow({ slug: 'my-cool-store' })
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'VERIFIED' }))
    mockStorefrontRepo.findStoreByUserId.mockResolvedValue(null)
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
    mockStorefrontRepo.findStoreByUserId.mockResolvedValue(null)
    mockStorefrontRepo.checkSlugAvailable.mockResolvedValue(false)

    await expect(
      provisionStorefront(mockUser, { name: 'Test Shop', slug: 'taken-slug' }),
    ).rejects.toThrow(InvalidStoreSlugError)

    expect(mockStorefrontRepo.createStore).not.toHaveBeenCalled()
  })

  it('sets isPrimary true on the first store', async () => {
    const storeRow = makeStoreRow({ isPrimary: true })
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'VERIFIED' }))
    mockStorefrontRepo.findStoreByUserId.mockResolvedValue(null)
    mockStorefrontRepo.checkSlugAvailable.mockResolvedValue(true)
    mockStorefrontRepo.createStore.mockResolvedValue(storeRow)

    const result = await provisionStorefront(mockUser, { name: 'Test Shop', slug: 'test-shop' })

    expect(result.isPrimary).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getOnboardingStatus
// ---------------------------------------------------------------------------
describe('getOnboardingStatus', () => {
  it('isFullyProvisioned is false when no store exists', async () => {
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'VERIFIED' }))
    mockStorefrontRepo.findStoreByUserId.mockResolvedValue(null)

    const result = await getOnboardingStatus(mockUser)

    expect(result.isFullyProvisioned).toBe(false)
    expect(result.hasStore).toBe(false)
    expect(result.store).toBeNull()
  })

  it('isFullyProvisioned is true when seller is verified and has a store', async () => {
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'VERIFIED' }))
    mockStorefrontRepo.findStoreByUserId.mockResolvedValue(makeStoreRow())

    const result = await getOnboardingStatus(mockUser)

    expect(result.isFullyProvisioned).toBe(true)
    expect(result.isVerified).toBe(true)
    expect(result.hasStore).toBe(true)
    expect(result.store).not.toBeNull()
  })

  it('isVerified is false when verificationStatus is PENDING', async () => {
    mockSellerRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile({ verificationStatus: 'PENDING' }))
    mockStorefrontRepo.findStoreByUserId.mockResolvedValue(null)

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

    const result = await checkSlugAvailability('taken-slug')

    expect(result.available).toBe(false)
    expect(result.suggestion).toMatch(/^taken-slug-\d{4}$/)
  })
})

// ---------------------------------------------------------------------------
// updateStoreSettings
// ---------------------------------------------------------------------------
describe('updateStoreSettings', () => {
  it('throws StoreProvisioningRequiredError when no primary store exists', async () => {
    mockStorefrontRepo.findPrimaryStoreByUserId.mockResolvedValue(null)

    await expect(
      updateStoreSettings(mockUser, { name: 'New Name' }),
    ).rejects.toThrow(StoreProvisioningRequiredError)

    expect(mockStorefrontRepo.updateStoreSettings).not.toHaveBeenCalled()
  })

  it('updates and returns the store when it exists', async () => {
    const original = makeStoreRow()
    const updated = makeStoreRow({ name: 'New Name' })
    mockStorefrontRepo.findPrimaryStoreByUserId.mockResolvedValue(original)
    mockStorefrontRepo.updateStoreSettings.mockResolvedValue(updated)

    const result = await updateStoreSettings(mockUser, { name: 'New Name' })

    expect(mockStorefrontRepo.updateStoreSettings).toHaveBeenCalledWith(original.id, { name: 'New Name' })
    expect(result.name).toBe('New Name')
  })
})
