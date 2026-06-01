import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/moderation/seller/seller-moderation.repository')
vi.mock('@/lib/auth/adminGuards')
vi.mock('@/features/email/events/email.events', () => ({
  emitSellerApprovedEmailEvent: vi.fn(),
  emitSellerRejectedEmailEvent: vi.fn(),
}))
vi.mock('@/features/notifications/events/notification.events', () => ({
  emitSellerApprovedNotificationEvent: vi.fn(),
  emitSellerRejectedNotificationEvent: vi.fn(),
}))

import * as repo from '@/features/moderation/seller/seller-moderation.repository'
import * as adminGuards from '@/lib/auth/adminGuards'
import {
  emitSellerApprovedEmailEvent,
  emitSellerRejectedEmailEvent,
} from '@/features/email/events/email.events'
import {
  emitSellerApprovedNotificationEvent,
  emitSellerRejectedNotificationEvent,
} from '@/features/notifications/events/notification.events'
import {
  approveSeller,
  rejectSeller,
  suspendSeller,
  reactivateSeller,
} from '@/features/moderation/seller/seller-moderation.service'
import {
  InvalidModerationTransitionError,
  SelfModerationError,
} from '@/lib/errors/admin'
import { SellerProfileNotFoundError } from '@/lib/errors/profile'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { SellerProfile } from '@/app/generated/prisma/client'

const mockRepo = vi.mocked(repo)
const mockGuards = vi.mocked(adminGuards)
const mockEmitSellerApprovedEmailEvent = vi.mocked(emitSellerApprovedEmailEvent)
const mockEmitSellerRejectedEmailEvent = vi.mocked(emitSellerRejectedEmailEvent)
const mockEmitSellerApprovedNotificationEvent = vi.mocked(emitSellerApprovedNotificationEvent)
const mockEmitSellerRejectedNotificationEvent = vi.mocked(emitSellerRejectedNotificationEvent)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_ID = 'admin-uuid-0001'
const SELLER_ID = 'seller-uuid-0001'
const SELLER_USER_ID = 'user-uuid-seller-0001'

const mockAdmin: SessionUser = { id: ADMIN_ID, email: 'admin@test.com', roles: [] }

function makeSeller(overrides: Partial<SellerProfile> = {}): SellerProfile {
  return {
    id: SELLER_ID,
    userId: SELLER_USER_ID,
    verificationStatus: 'PENDING',
    verifiedAt: null,
    verifiedBy: null,
    businessName: 'Test Business',
    taxId: null,
    payoutAccountId: null,
    moderationReason: null,
    moderatedAt: null,
    moderatedBy: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function makeUpdatedSeller(overrides: Partial<SellerProfile> = {}): SellerProfile {
  return makeSeller({ moderatedAt: new Date(), moderatedBy: ADMIN_ID, ...overrides })
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks()
  mockGuards.assertAdminAccess.mockReturnValue(undefined)
  mockGuards.assertNotSelfModeration.mockReturnValue(undefined)
  mockEmitSellerApprovedEmailEvent.mockResolvedValue(null)
  mockEmitSellerRejectedEmailEvent.mockResolvedValue(null)
  mockEmitSellerApprovedNotificationEvent.mockResolvedValue({} as never)
  mockEmitSellerRejectedNotificationEvent.mockResolvedValue({} as never)
})

// ---------------------------------------------------------------------------
// approveSeller
// ---------------------------------------------------------------------------

describe('approveSeller', () => {
  it('PENDING → VERIFIED succeeds and returns SellerModerationDto', async () => {
    const seller = makeSeller({ verificationStatus: 'PENDING' })
    const updated = makeUpdatedSeller({ verificationStatus: 'VERIFIED' })

    mockRepo.findSellerProfileById.mockResolvedValue(seller)
    mockRepo.updateSellerVerificationStatus.mockResolvedValue(updated)

    const result = await approveSeller(mockAdmin, SELLER_ID)

    expect(mockGuards.assertAdminAccess).toHaveBeenCalledWith(mockAdmin)
    expect(mockGuards.assertNotSelfModeration).toHaveBeenCalledWith(ADMIN_ID, SELLER_USER_ID)
    expect(mockRepo.updateSellerVerificationStatus).toHaveBeenCalledWith(
      SELLER_ID,
      'VERIFIED',
      ADMIN_ID,
    )
    expect(result.id).toBe(SELLER_ID)
    expect(result.verificationStatus).toBe('VERIFIED')
    expect(result.moderatedBy).toBe(ADMIN_ID)
    expect(mockEmitSellerApprovedNotificationEvent).toHaveBeenCalledWith({
      sellerUserId: SELLER_USER_ID,
      businessName: 'Test Business',
    })
  })

  it('throws InvalidModerationTransitionError when seller is not PENDING', async () => {
    const seller = makeSeller({ verificationStatus: 'VERIFIED' })
    mockRepo.findSellerProfileById.mockResolvedValue(seller)

    await expect(approveSeller(mockAdmin, SELLER_ID)).rejects.toThrow(
      InvalidModerationTransitionError,
    )
    expect(mockRepo.updateSellerVerificationStatus).not.toHaveBeenCalled()
  })

  it('throws SellerProfileNotFoundError when seller does not exist', async () => {
    mockRepo.findSellerProfileById.mockResolvedValue(null)

    await expect(approveSeller(mockAdmin, SELLER_ID)).rejects.toThrow(SellerProfileNotFoundError)
  })
})

// ---------------------------------------------------------------------------
// rejectSeller
// ---------------------------------------------------------------------------

describe('rejectSeller', () => {
  it('PENDING → REJECTED with reason succeeds', async () => {
    const seller = makeSeller({ verificationStatus: 'PENDING' })
    const updated = makeUpdatedSeller({
      verificationStatus: 'REJECTED',
      moderationReason: 'Incomplete documentation provided',
    })

    mockRepo.findSellerProfileById.mockResolvedValue(seller)
    mockRepo.updateSellerVerificationStatus.mockResolvedValue(updated)

    const result = await rejectSeller(mockAdmin, SELLER_ID, 'Incomplete documentation provided')

    expect(mockRepo.updateSellerVerificationStatus).toHaveBeenCalledWith(
      SELLER_ID,
      'REJECTED',
      ADMIN_ID,
      'Incomplete documentation provided',
    )
    expect(result.verificationStatus).toBe('REJECTED')
    expect(result.moderationReason).toBe('Incomplete documentation provided')
    expect(mockEmitSellerRejectedNotificationEvent).toHaveBeenCalledWith({
      sellerUserId: SELLER_USER_ID,
      businessName: 'Test Business',
      reason: 'Incomplete documentation provided',
    })
  })

  it('throws InvalidModerationTransitionError on wrong state', async () => {
    const seller = makeSeller({ verificationStatus: 'VERIFIED' })
    mockRepo.findSellerProfileById.mockResolvedValue(seller)

    await expect(
      rejectSeller(mockAdmin, SELLER_ID, 'Incomplete documentation provided'),
    ).rejects.toThrow(InvalidModerationTransitionError)
    expect(mockRepo.updateSellerVerificationStatus).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// suspendSeller
// ---------------------------------------------------------------------------

describe('suspendSeller', () => {
  it('VERIFIED → SUSPENDED succeeds and deactivates stores', async () => {
    const seller = makeSeller({ verificationStatus: 'VERIFIED' })
    const updated = makeUpdatedSeller({
      verificationStatus: 'SUSPENDED',
      moderationReason: 'Policy violation',
    })

    mockRepo.findSellerProfileById.mockResolvedValue(seller)
    mockRepo.updateSellerVerificationStatus.mockResolvedValue(updated)
    mockRepo.deactivateSellerStores.mockResolvedValue(undefined)

    const result = await suspendSeller(mockAdmin, SELLER_ID, 'Policy violation')

    expect(mockRepo.updateSellerVerificationStatus).toHaveBeenCalledWith(
      SELLER_ID,
      'SUSPENDED',
      ADMIN_ID,
      'Policy violation',
    )
    expect(mockRepo.deactivateSellerStores).toHaveBeenCalledWith(SELLER_USER_ID)
    expect(result.verificationStatus).toBe('SUSPENDED')
  })

  it('throws InvalidModerationTransitionError on non-VERIFIED seller', async () => {
    const seller = makeSeller({ verificationStatus: 'PENDING' })
    mockRepo.findSellerProfileById.mockResolvedValue(seller)

    await expect(suspendSeller(mockAdmin, SELLER_ID, 'Policy violation')).rejects.toThrow(
      InvalidModerationTransitionError,
    )
    expect(mockRepo.updateSellerVerificationStatus).not.toHaveBeenCalled()
    expect(mockRepo.deactivateSellerStores).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// reactivateSeller
// ---------------------------------------------------------------------------

describe('reactivateSeller', () => {
  it('SUSPENDED → VERIFIED succeeds', async () => {
    const seller = makeSeller({ verificationStatus: 'SUSPENDED' })
    const updated = makeUpdatedSeller({ verificationStatus: 'VERIFIED' })

    mockRepo.findSellerProfileById.mockResolvedValue(seller)
    mockRepo.updateSellerVerificationStatus.mockResolvedValue(updated)

    const result = await reactivateSeller(mockAdmin, SELLER_ID)

    expect(mockRepo.updateSellerVerificationStatus).toHaveBeenCalledWith(
      SELLER_ID,
      'VERIFIED',
      ADMIN_ID,
    )
    expect(result.verificationStatus).toBe('VERIFIED')
  })
})

// ---------------------------------------------------------------------------
// assertNotSelfModeration (via approveSeller)
// ---------------------------------------------------------------------------

describe('assertNotSelfModeration integration', () => {
  it('throws SelfModerationError when adminId matches seller.userId', async () => {
    // Reset the mock to throw the real error
    mockGuards.assertNotSelfModeration.mockImplementation((adminId, targetId) => {
      if (adminId === targetId) throw new SelfModerationError()
    })

    // Seller whose userId matches the admin's id
    const selfSeller = makeSeller({
      verificationStatus: 'PENDING',
      userId: ADMIN_ID,
    })
    mockRepo.findSellerProfileById.mockResolvedValue(selfSeller)

    await expect(approveSeller(mockAdmin, SELLER_ID)).rejects.toThrow(SelfModerationError)
  })
})
