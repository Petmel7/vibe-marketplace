import Decimal from 'decimal.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductBadgeType, UserRole } from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import {
  getAdminBadgeRules,
  updateHitBadgeRule,
} from './product-badge-rule.service'
import * as repository from './product-badge-rule.repository'
import * as jobsQueue from '@/features/jobs/jobs.queue'
import {
  BadgeRuleNotFoundError,
  InvalidBadgeRuleError,
  UnauthorizedBadgeRuleMutationError,
} from '@/lib/errors/product'

vi.mock('./product-badge-rule.repository', () => ({
  findAllBadgeRules: vi.fn(),
  findBadgeRuleByType: vi.fn(),
  updateBadgeRuleByType: vi.fn(),
}))

vi.mock('@/features/jobs/jobs.queue', () => ({
  enqueueProductMetricsJob: vi.fn(),
}))

const mockedRepository = vi.mocked(repository)
const mockedJobsQueue = vi.mocked(jobsQueue)

const adminUser: SessionUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
}

const sellerUser: SessionUser = {
  id: 'seller-1',
  email: 'seller@example.com',
  roles: [UserRole.SELLER],
}

function makeHitRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-hit',
    badgeType: ProductBadgeType.HIT,
    minViews: 3,
    minWishlists: 2,
    minSoldCount: 1,
    minRevenueAmount: new Decimal(0),
    enabled: true,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedBy: 'admin-1',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedJobsQueue.enqueueProductMetricsJob.mockResolvedValue(null)
})

describe('getAdminBadgeRules', () => {
  it('returns badge rules for admins', async () => {
    mockedRepository.findAllBadgeRules.mockResolvedValue([makeHitRule()] as never)

    const result = await getAdminBadgeRules(adminUser)

    expect(result.items).toEqual([
      expect.objectContaining({
        badgeType: ProductBadgeType.HIT,
        minViews: 3,
        minWishlists: 2,
        minSoldCount: 1,
        minRevenueAmount: '0',
      }),
    ])
  })
})

describe('updateHitBadgeRule', () => {
  it('allows admin to update thresholds and triggers recalculation', async () => {
    mockedRepository.findBadgeRuleByType.mockResolvedValue(makeHitRule() as never)
    mockedRepository.updateBadgeRuleByType.mockResolvedValue(
      makeHitRule({
        minViews: 5,
        minWishlists: 4,
        minSoldCount: 2,
        enabled: true,
        updatedAt: new Date('2026-05-23T10:00:00.000Z'),
      }) as never,
    )

    const result = await updateHitBadgeRule(adminUser, {
      minViews: 5,
      minWishlists: 4,
      minSoldCount: 2,
    })

    expect(mockedRepository.updateBadgeRuleByType).toHaveBeenCalledWith(
      expect.objectContaining({
        badgeType: ProductBadgeType.HIT,
        minViews: 5,
        minWishlists: 4,
        minSoldCount: 2,
        updatedBy: adminUser.id,
      }),
    )
    expect(mockedJobsQueue.enqueueProductMetricsJob).toHaveBeenCalledTimes(1)
    expect(result.minViews).toBe(5)
  })

  it('rejects non-admin badge rule updates', async () => {
    await expect(
      updateHitBadgeRule(sellerUser, { minViews: 4 }),
    ).rejects.toThrow(UnauthorizedBadgeRuleMutationError)
  })

  it('throws when the HIT rule is missing', async () => {
    mockedRepository.findBadgeRuleByType.mockResolvedValue(null)

    await expect(
      updateHitBadgeRule(adminUser, { minViews: 4 }),
    ).rejects.toThrow(BadgeRuleNotFoundError)
  })

  it('rejects enabled rules without any positive threshold', async () => {
    mockedRepository.findBadgeRuleByType.mockResolvedValue(makeHitRule() as never)

    await expect(
      updateHitBadgeRule(adminUser, {
        minViews: 0,
        minWishlists: 0,
        minSoldCount: 0,
        minRevenueAmount: '0',
        enabled: true,
      }),
    ).rejects.toThrow(InvalidBadgeRuleError)
  })

  it('allows disabling the rule even when thresholds are zeroed out', async () => {
    mockedRepository.findBadgeRuleByType.mockResolvedValue(makeHitRule() as never)
    mockedRepository.updateBadgeRuleByType.mockResolvedValue(
      makeHitRule({
        minViews: 0,
        minWishlists: 0,
        minSoldCount: 0,
        minRevenueAmount: new Decimal(0),
        enabled: false,
      }) as never,
    )

    const result = await updateHitBadgeRule(adminUser, {
      minViews: 0,
      minWishlists: 0,
      minSoldCount: 0,
      minRevenueAmount: '0',
      enabled: false,
    })

    expect(result.enabled).toBe(false)
    expect(mockedJobsQueue.enqueueProductMetricsJob).toHaveBeenCalledTimes(1)
  })
})
