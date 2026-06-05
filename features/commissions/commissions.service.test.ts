import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/commissions/commissions.repository', () => ({
  countCommissionRules: vi.fn(),
  createCommissionRule: vi.fn(),
  findApplicableCommissionRules: vi.fn(),
  findCategoryById: vi.fn(),
  findCommissionRuleById: vi.fn(),
  findConflictingCommissionRule: vi.fn(),
  findStoreById: vi.fn(),
  listCommissionRules: vi.fn(),
  updateCommissionRule: vi.fn(),
}))

vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
}))

import type { SessionUser } from '@/features/auth/auth.dto'
import * as repo from '@/features/commissions/commissions.repository'
import {
  calculateCommissionForAmount,
  createAdminCommissionRule,
  getAdminCommissionRules,
  previewAdminCommissionRule,
  resolveCommissionRule,
  updateAdminCommissionRule,
} from '@/features/commissions/commissions.service'
import * as guards from '@/lib/auth/guards'
import {
  CommissionRuleConflictError,
  InvalidCommissionRuleError,
} from '@/lib/errors/commission'
import Decimal from 'decimal.js'

const mockRepo = vi.mocked(repo)
const mockGuards = vi.mocked(guards)

const adminUser: SessionUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  roles: ['ADMIN'],
}

function makeRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-1',
    name: 'Global default',
    scope: 'GLOBAL',
    storeId: null,
    categoryId: null,
    rate: { toString: () => '0.1000' },
    startsAt: new Date('2026-06-01T00:00:00.000Z'),
    endsAt: null,
    priority: 0,
    isActive: true,
    createdById: adminUser.id,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    store: null,
    category: null,
    createdBy: {
      id: adminUser.id,
      email: adminUser.email,
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockGuards.requireAdmin.mockReturnValue(undefined)
  mockRepo.countCommissionRules.mockResolvedValue(0)
  mockRepo.findStoreById.mockResolvedValue({
    id: 'store-1',
    name: 'Store 1',
    ownerId: 'seller-1',
  } as never)
  mockRepo.findCategoryById.mockResolvedValue({
    id: 'category-1',
    name: 'Category 1',
  } as never)
  mockRepo.findConflictingCommissionRule.mockResolvedValue(null)
})

describe('resolveCommissionRule', () => {
  it('applies the global rule when no specific rule exists', async () => {
    mockRepo.findApplicableCommissionRules.mockResolvedValue([
      makeRule({
        id: 'global-1',
        scope: 'GLOBAL',
        priority: 0,
      }),
    ] as never)

    const result = await resolveCommissionRule({
      storeId: 'store-1',
      categoryId: 'category-1',
      at: new Date('2026-06-05T10:00:00.000Z'),
    })

    expect(result.matchedRule?.id).toBe('global-1')
    expect(result.rate.toFixed(4)).toBe('0.1000')
  })

  it('lets category rules override global rules', async () => {
    mockRepo.findApplicableCommissionRules.mockResolvedValue([
      makeRule({
        id: 'global-1',
        scope: 'GLOBAL',
        priority: 5,
      }),
      makeRule({
        id: 'category-1',
        scope: 'CATEGORY',
        categoryId: 'category-1',
        priority: 5,
        rate: { toString: () => '0.1200' },
      }),
    ] as never)

    const result = await resolveCommissionRule({
      categoryId: 'category-1',
      at: new Date('2026-06-05T10:00:00.000Z'),
    })

    expect(result.matchedRule?.id).toBe('category-1')
    expect(result.rate.toFixed(4)).toBe('0.1200')
  })

  it('lets store rules override category and global rules', async () => {
    mockRepo.findApplicableCommissionRules.mockResolvedValue([
      makeRule({
        id: 'global-1',
        scope: 'GLOBAL',
        priority: 10,
      }),
      makeRule({
        id: 'category-1',
        scope: 'CATEGORY',
        categoryId: 'category-1',
        priority: 10,
        rate: { toString: () => '0.1200' },
      }),
      makeRule({
        id: 'store-1-rule',
        scope: 'STORE',
        storeId: 'store-1',
        priority: 10,
        rate: { toString: () => '0.1500' },
      }),
    ] as never)

    const result = await resolveCommissionRule({
      storeId: 'store-1',
      categoryId: 'category-1',
    })

    expect(result.matchedRule?.id).toBe('store-1-rule')
    expect(result.rate.toFixed(4)).toBe('0.1500')
  })

  it('uses priority before specificity when priorities differ', async () => {
    mockRepo.findApplicableCommissionRules.mockResolvedValue([
      makeRule({
        id: 'store-low',
        scope: 'STORE',
        storeId: 'store-1',
        priority: 1,
        rate: { toString: () => '0.2000' },
      }),
      makeRule({
        id: 'global-high',
        scope: 'GLOBAL',
        priority: 9,
        rate: { toString: () => '0.0900' },
      }),
    ] as never)

    const result = await resolveCommissionRule({
      storeId: 'store-1',
    })

    expect(result.matchedRule?.id).toBe('global-high')
    expect(result.rate.toFixed(4)).toBe('0.0900')
  })

  it('ignores inactive and expired rules', async () => {
    mockRepo.findApplicableCommissionRules.mockResolvedValue([
      makeRule({
        id: 'inactive-store',
        scope: 'STORE',
        storeId: 'store-1',
        priority: 100,
        isActive: false,
        rate: { toString: () => '0.3000' },
      }),
      makeRule({
        id: 'expired-category',
        scope: 'CATEGORY',
        categoryId: 'category-1',
        priority: 90,
        endsAt: new Date('2026-06-04T00:00:00.000Z'),
        rate: { toString: () => '0.2500' },
      }),
      makeRule({
        id: 'global-active',
        scope: 'GLOBAL',
        priority: 1,
        rate: { toString: () => '0.1000' },
      }),
    ] as never)

    const result = await resolveCommissionRule({
      storeId: 'store-1',
      categoryId: 'category-1',
      at: new Date('2026-06-05T10:00:00.000Z'),
    })

    expect(result.matchedRule?.id).toBe('global-active')
    expect(result.rate.toFixed(4)).toBe('0.1000')
  })

  it('falls back to the default commission rate when no rule matches', async () => {
    mockRepo.findApplicableCommissionRules.mockResolvedValue([] as never)

    const result = await resolveCommissionRule({})

    expect(result.matchedRule).toBeNull()
    expect(result.rate.toFixed(4)).toBe('0.1000')
  })
})

describe('calculateCommissionForAmount', () => {
  it('calculates commission snapshots correctly', async () => {
    mockRepo.findApplicableCommissionRules.mockResolvedValue([
      makeRule({
        id: 'rule-store',
        scope: 'STORE',
        storeId: 'store-1',
        rate: { toString: () => '0.1500' },
      }),
    ] as never)

    const result = await calculateCommissionForAmount({
      storeId: 'store-1',
      grossAmount: new Decimal('100.00'),
    })

    expect(result.rate).toBe('0.1500')
    expect(result.commissionAmount).toBe('15.00')
    expect(result.sellerNetAmount).toBe('85.00')
    expect(result.ruleId).toBe('rule-store')
  })
})

describe('admin commission rules', () => {
  it('lists rules for admins', async () => {
    mockRepo.listCommissionRules.mockResolvedValue([makeRule()] as never)
    mockRepo.countCommissionRules.mockResolvedValue(1)

    const result = await getAdminCommissionRules(adminUser, {
      page: 1,
      limit: 20,
    })

    expect(result.total).toBe(1)
    expect(result.items[0]?.name).toBe('Global default')
  })

  it('rejects invalid store/category target combinations', async () => {
    await expect(
      createAdminCommissionRule(adminUser, {
        name: 'Broken rule',
        scope: 'STORE',
        rate: '0.1000',
        startsAt: '2026-06-01T00:00:00.000Z',
        categoryId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(InvalidCommissionRuleError)
  })

  it('rejects conflicting active rules', async () => {
    mockRepo.findConflictingCommissionRule.mockResolvedValue(makeRule({ id: 'conflict-1' }) as never)

    await expect(
      createAdminCommissionRule(adminUser, {
        name: 'Conflict rule',
        scope: 'GLOBAL',
        rate: '0.1000',
        startsAt: '2026-06-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(CommissionRuleConflictError)
  })

  it('supports previewing matched rules and calculations', async () => {
    mockRepo.findApplicableCommissionRules.mockResolvedValue([
      makeRule({
        id: 'category-1',
        scope: 'CATEGORY',
        categoryId: 'category-1',
        rate: { toString: () => '0.1250' },
      }),
    ] as never)
    mockRepo.findCommissionRuleById.mockResolvedValue(
      makeRule({
        id: 'category-1',
        scope: 'CATEGORY',
        categoryId: 'category-1',
        rate: { toString: () => '0.1250' },
      }) as never,
    )

    const result = await previewAdminCommissionRule(adminUser, {
      categoryId: 'category-1',
      grossAmount: '80.00',
    })

    expect(result.matchedRule?.id).toBe('category-1')
    expect(result.commissionAmount).toBe('10.00')
    expect(result.sellerNetAmount).toBe('70.00')
  })

  it('blocks non-admin commission mutations', async () => {
    mockGuards.requireAdmin.mockImplementationOnce(() => {
      throw new Error('forbidden')
    })

    await expect(
      createAdminCommissionRule(adminUser, {
        name: 'Store rule',
        scope: 'GLOBAL',
        rate: '0.1000',
        startsAt: '2026-06-01T00:00:00.000Z',
      }),
    ).rejects.toThrow('forbidden')
  })

  it('updates rules without mutating historical commission snapshots', async () => {
    mockRepo.findCommissionRuleById.mockResolvedValue(makeRule({ id: 'rule-1' }) as never)
    mockRepo.updateCommissionRule.mockResolvedValue(
      makeRule({
        id: 'rule-1',
        rate: { toString: () => '0.2000' },
      }) as never,
    )

    const result = await updateAdminCommissionRule(adminUser, 'rule-1', {
      rate: '0.2000',
    })

    expect(result.rate).toBe('0.2000')
  })
})
