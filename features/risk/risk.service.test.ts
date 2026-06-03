import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RiskLevel,
  RiskSignalType,
  UserRole,
} from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import { AdminAccessError } from '@/lib/errors/admin'
import { RiskValidationError } from '@/lib/errors/risk'
import * as riskRepository from './risk.repository'
import * as notificationsService from '@/features/notifications/notifications.service'
import * as authGuards from '@/lib/auth/guards'
import {
  getAdminStoreRiskProfiles,
  getAdminUserRiskProfiles,
  recordRiskSignal,
  recalculateRiskProfile,
  recalculateAdminRiskProfiles,
} from './risk.service'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('./risk.repository')
vi.mock('@/features/notifications/notifications.service')
vi.mock('@/lib/auth/guards')
vi.mock('@/utils/logger', () => ({ logError: vi.fn() }))

const mockRepo = vi.mocked(riskRepository)
const mockNotifications = vi.mocked(notificationsService)
const mockGuards = vi.mocked(authGuards)

const adminUser: SessionUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
}

const buyerUser: SessionUser = {
  id: 'buyer-1',
  email: 'buyer@example.com',
  roles: [UserRole.BUYER],
}

function makeUserProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'risk-user-1',
    userId: 'user-1',
    storeId: null,
    score: { toString: () => '10.00' },
    level: RiskLevel.LOW,
    lastCalculatedAt: new Date('2026-06-03T10:00:00.000Z'),
    createdAt: new Date('2026-06-03T10:00:00.000Z'),
    updatedAt: new Date('2026-06-03T10:00:00.000Z'),
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Risk User',
      profile: { displayName: 'Risk Display' },
      roles: [{ role: UserRole.BUYER }],
    },
    store: null,
    ...overrides,
  }
}

function makeStoreProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'risk-store-1',
    userId: null,
    storeId: 'store-1',
    score: { toString: () => '20.00' },
    level: RiskLevel.MEDIUM,
    lastCalculatedAt: new Date('2026-06-03T10:00:00.000Z'),
    createdAt: new Date('2026-06-03T10:00:00.000Z'),
    updatedAt: new Date('2026-06-03T10:00:00.000Z'),
    user: null,
    store: {
      id: 'store-1',
      name: 'Risk Store',
      slug: 'risk-store',
      owner: {
        id: 'seller-1',
        email: 'seller@example.com',
        name: 'Seller',
        profile: { displayName: 'Seller Display' },
      },
    },
    ...overrides,
  }
}

function makeSignal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'signal-1',
    userId: 'user-1',
    storeId: null,
    sourceType: 'PAYMENT',
    sourceId: 'payment-1',
    signalType: RiskSignalType.PAYMENT_FAILED,
    weight: { toString: () => '8.00' },
    metadata: { paymentId: 'payment-1' },
    createdAt: new Date('2026-06-03T10:00:00.000Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGuards.requireAdmin.mockImplementation(() => undefined)
  mockNotifications.createAdminNotification.mockResolvedValue([] as never)
  mockRepo.findRiskUserSubjectById.mockResolvedValue({
    id: 'user-1',
    email: 'user@example.com',
    name: 'Risk User',
    profile: { displayName: 'Risk Display' },
    roles: [{ role: UserRole.BUYER }],
  } as never)
  mockRepo.findRiskStoreSubjectById.mockResolvedValue({
    id: 'store-1',
    name: 'Risk Store',
    slug: 'risk-store',
    ownerId: 'seller-1',
    owner: {
      id: 'seller-1',
      email: 'seller@example.com',
      name: 'Seller',
      profile: { displayName: 'Seller Display' },
    },
  } as never)
})

describe('risk.service', () => {
  it('creates a risk signal and recalculates the targeted user profile', async () => {
    mockRepo.findExistingRiskSignal.mockResolvedValue(null)
    mockRepo.createRiskSignalRecord.mockResolvedValue(makeSignal() as never)
    mockRepo.findRiskProfileByUserId.mockResolvedValue(makeUserProfile({ level: RiskLevel.LOW }) as never)
    mockRepo.listRiskSignalsByUserId.mockResolvedValue([makeSignal()] as never)
    mockRepo.upsertUserRiskProfile.mockResolvedValue(makeUserProfile({ score: { toString: () => '8.00' } }) as never)

    const result = await recordRiskSignal({
      userId: 'user-1',
      sourceType: 'PAYMENT',
      sourceId: 'payment-1',
      signalType: RiskSignalType.PAYMENT_FAILED,
    })

    expect(mockRepo.createRiskSignalRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        signalType: RiskSignalType.PAYMENT_FAILED,
      }),
    )
    expect(mockRepo.upsertUserRiskProfile).toHaveBeenCalled()
    expect(result.duplicate).toBe(false)
  })

  it('reuses an existing exact signal instead of duplicating it', async () => {
    mockRepo.findExistingRiskSignal.mockResolvedValue(makeSignal() as never)

    const result = await recordRiskSignal({
      userId: 'user-1',
      sourceType: 'PAYMENT',
      sourceId: 'payment-1',
      signalType: RiskSignalType.PAYMENT_FAILED,
    })

    expect(mockRepo.createRiskSignalRecord).not.toHaveBeenCalled()
    expect(mockRepo.upsertUserRiskProfile).not.toHaveBeenCalled()
    expect(result.duplicate).toBe(true)
  })

  it('maps accumulated signal weights to HIGH and CRITICAL risk levels', async () => {
    mockRepo.findRiskProfileByUserId.mockResolvedValue(null)
    mockRepo.listRiskSignalsByUserId
      .mockResolvedValueOnce([
        makeSignal({ weight: { toString: () => '55.00' } }),
      ] as never)
      .mockResolvedValueOnce([
        makeSignal({ weight: { toString: () => '85.00' } }),
      ] as never)
    mockRepo.upsertUserRiskProfile
      .mockResolvedValueOnce(makeUserProfile({
        score: { toString: () => '55.00' },
        level: RiskLevel.HIGH,
      }) as never)
      .mockResolvedValueOnce(makeUserProfile({
        score: { toString: () => '85.00' },
        level: RiskLevel.CRITICAL,
      }) as never)

    const high = await recalculateRiskProfile({ userId: 'user-1' })
    const critical = await recalculateRiskProfile({ userId: 'user-1' })

    expect(high.level).toBe(RiskLevel.HIGH)
    expect(critical.level).toBe(RiskLevel.CRITICAL)
  })

  it('notifies admins when a profile crosses into CRITICAL risk', async () => {
    mockRepo.findExistingRiskSignal.mockResolvedValue(null)
    mockRepo.createRiskSignalRecord.mockResolvedValue(
      makeSignal({
        signalType: RiskSignalType.SELLER_SUSPENDED,
        weight: { toString: () => '45.00' },
      }) as never,
    )
    mockRepo.findRiskProfileByStoreId.mockResolvedValue(makeStoreProfile({ level: RiskLevel.HIGH }) as never)
    mockRepo.listRiskSignalsByStoreId.mockResolvedValue([
      makeSignal({
        userId: 'seller-1',
        storeId: 'store-1',
        signalType: RiskSignalType.SELLER_SUSPENDED,
        weight: { toString: () => '85.00' },
      }),
    ] as never)
    mockRepo.upsertStoreRiskProfile.mockResolvedValue(
      makeStoreProfile({
        score: { toString: () => '85.00' },
        level: RiskLevel.CRITICAL,
      }) as never,
    )

    await recordRiskSignal({
      userId: 'seller-1',
      storeId: 'store-1',
      sourceType: 'SELLER_MODERATION',
      sourceId: 'seller-1',
      signalType: RiskSignalType.SELLER_SUSPENDED,
    })

    await vi.waitFor(() => {
      expect(mockNotifications.createAdminNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            targetType: 'STORE',
            targetId: 'store-1',
            level: RiskLevel.CRITICAL,
          }),
        }),
      )
    })
  })

  it('blocks malformed risk recalculation requests with no target', async () => {
    await expect(recalculateRiskProfile({})).rejects.toThrow(RiskValidationError)
  })

  it('restricts admin diagnostics endpoints to admins only', async () => {
    mockGuards.requireAdmin.mockImplementation(() => {
      throw new AdminAccessError()
    })

    await expect(getAdminUserRiskProfiles(buyerUser, { page: 1, limit: 20 })).rejects.toThrow(
      AdminAccessError,
    )
    await expect(getAdminStoreRiskProfiles(buyerUser, { page: 1, limit: 20 })).rejects.toThrow(
      AdminAccessError,
    )
  })

  it('recalculates all known user and store profiles without automatic enforcement', async () => {
    mockRepo.listRiskUserIdsForRecalculation.mockResolvedValue(['user-1'])
    mockRepo.listRiskStoreIdsForRecalculation.mockResolvedValue(['store-1'])
    mockRepo.findRiskProfileByUserId.mockResolvedValue(makeUserProfile() as never)
    mockRepo.findRiskProfileByStoreId.mockResolvedValue(makeStoreProfile() as never)
    mockRepo.listRiskSignalsByUserId.mockResolvedValue([makeSignal()] as never)
    mockRepo.listRiskSignalsByStoreId.mockResolvedValue([
      makeSignal({ userId: 'seller-1', storeId: 'store-1', weight: { toString: () => '20.00' } }),
    ] as never)
    mockRepo.upsertUserRiskProfile.mockResolvedValue(makeUserProfile({ score: { toString: () => '8.00' } }) as never)
    mockRepo.upsertStoreRiskProfile.mockResolvedValue(makeStoreProfile({ score: { toString: () => '20.00' } }) as never)

    const result = await recalculateAdminRiskProfiles(adminUser, { targetType: 'ALL' })

    expect(result.processed).toBe(2)
    expect(result.items).toHaveLength(2)
    expect(mockNotifications.createAdminNotification).not.toHaveBeenCalled()
  })
})
