import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/payouts/payouts.repository', () => ({
  countAdminPayouts: vi.fn(),
  countAdminSellerBalances: vi.fn(),
  countSellerLedgerEntriesByOwnerId: vi.fn(),
  countSellerPayoutsByOwnerId: vi.fn(),
  createManualPayout: vi.fn(),
  createSellerFinanceEntriesForOrderItems: vi.fn(),
  findOrderById: vi.fn(),
  findOwnedStoreById: vi.fn(),
  findPayoutById: vi.fn(),
  findSellerBalanceByStoreId: vi.fn(),
  findStoreFinanceContextById: vi.fn(),
  getLedgerBalanceTotalsByStoreId: vi.fn(),
  listAdminPayouts: vi.fn(),
  listAdminSellerBalances: vi.fn(),
  listReservableLedgerEntriesByStoreId: vi.fn(),
  listSellerBalancesByOwnerId: vi.fn(),
  listSellerLedgerEntriesByOwnerId: vi.fn(),
  listSellerOwnedStoreIds: vi.fn(),
  listSellerPayoutsByOwnerId: vi.fn(),
  markPayoutLedgerEntriesPaidOut: vi.fn(),
  releaseEligiblePendingLedgerEntries: vi.fn(),
  releasePayoutLedgerEntries: vi.fn(),
  updatePayoutStatus: vi.fn(),
  upsertSellerBalance: vi.fn(),
}))
vi.mock('@/features/commissions/commissions.service', () => ({
  calculateCommissionForAmount: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
  requireSeller: vi.fn(),
}))
vi.mock('@/features/email/events/email.events', () => ({
  emitSellerPayoutPaidEmailEvent: vi.fn(),
}))
vi.mock('@/features/jobs/jobs.queue', () => ({
  enqueueSellerFundsReleaseJob: vi.fn(),
}))

import * as repo from '@/features/payouts/payouts.repository'
import * as commissionService from '@/features/commissions/commissions.service'
import * as guards from '@/lib/auth/guards'
import * as emailEvents from '@/features/email/events/email.events'
import * as jobsQueue from '@/features/jobs/jobs.queue'
import {
  createAdminManualPayout,
  getSellerFinanceSummary,
  materializeSellerFinanceForOrderAction,
  recalculateSellerBalances,
  updateAdminPayoutLifecycle,
} from '@/features/payouts/payouts.service'
import {
  InsufficientAvailableBalanceError,
  PayoutOwnershipError,
} from '@/lib/errors/payout'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockRepo = vi.mocked(repo)
const mockCommissionService = vi.mocked(commissionService)
const mockGuards = vi.mocked(guards)
const mockEmailEvents = vi.mocked(emailEvents)
const mockJobsQueue = vi.mocked(jobsQueue)

const adminUser: SessionUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  roles: ['ADMIN'],
}

const sellerUser: SessionUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'seller@example.com',
  roles: ['SELLER'],
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    status: 'paid',
    items: [
      {
        id: 'item-1',
        quantity: 2,
        storeId: 'store-1',
        unitPriceSnapshot: { toString: () => '50.00' },
        variant: {
          product: {
            categoryId: 'category-1',
          },
        },
        store: { id: 'store-1', ownerId: sellerUser.id, name: 'Store 1' },
        platformCommission: null,
      },
    ],
    payments: [
      {
        id: 'payment-1',
        method: 'CARD',
        status: 'SUCCEEDED',
      },
    ],
    ...overrides,
  }
}

function makeBalance(overrides: Record<string, unknown> = {}) {
  return {
    storeId: 'store-1',
    sellerId: sellerUser.id,
    pendingAmount: { toString: () => '0.00' },
    availableAmount: { toString: () => '90.00' },
    paidOutAmount: { toString: () => '0.00' },
    currency: 'UAH',
    updatedAt: new Date('2026-06-03T10:00:00.000Z'),
    store: {
      id: 'store-1',
      name: 'Store 1',
      ownerId: sellerUser.id,
      owner: {
        id: sellerUser.id,
        email: sellerUser.email,
        name: 'Seller User',
        profile: { displayName: 'Seller Display' },
      },
    },
    ...overrides,
  }
}

function makePayout(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payout-1',
    storeId: 'store-1',
    sellerId: sellerUser.id,
    amount: { toString: () => '90.00' },
    currency: 'UAH',
    method: 'MANUAL',
    status: 'PENDING',
    reference: null,
    adminNote: null,
    createdById: adminUser.id,
    paidAt: null,
    failedAt: null,
    createdAt: new Date('2026-06-03T10:00:00.000Z'),
    updatedAt: new Date('2026-06-03T10:00:00.000Z'),
    store: { id: 'store-1', name: 'Store 1' },
    seller: {
      id: sellerUser.id,
      email: sellerUser.email,
      name: 'Seller User',
      profile: { displayName: 'Seller Display' },
    },
    items: [
      {
        id: 'payout-item-1',
        ledgerEntryId: 'ledger-1',
        amount: { toString: () => '90.00' },
        createdAt: new Date('2026-06-03T10:00:00.000Z'),
      },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockGuards.requireAdmin.mockReturnValue(undefined)
  mockGuards.requireSeller.mockReturnValue(undefined)
  mockCommissionService.calculateCommissionForAmount.mockResolvedValue({
    ruleId: 'rule-1',
    ruleScope: 'GLOBAL',
    rate: '0.1000',
    commissionAmount: '10.00',
    sellerNetAmount: '90.00',
  })
  mockRepo.findStoreFinanceContextById.mockResolvedValue({
    id: 'store-1',
    name: 'Store 1',
    ownerId: sellerUser.id,
    owner: {
      id: sellerUser.id,
      email: sellerUser.email,
      name: 'Seller User',
      profile: { displayName: 'Seller Display' },
    },
  } as never)
  mockRepo.getLedgerBalanceTotalsByStoreId.mockResolvedValue({
    pendingAmount: { toString: () => '90.00', plus: vi.fn() } as never,
    availableAmount: { toString: () => '0.00', plus: vi.fn() } as never,
    paidOutAmount: { toString: () => '0.00', plus: vi.fn() } as never,
  })
  mockRepo.upsertSellerBalance.mockResolvedValue(makeBalance() as never)
  mockEmailEvents.emitSellerPayoutPaidEmailEvent.mockResolvedValue(null)
  mockJobsQueue.enqueueSellerFundsReleaseJob.mockResolvedValue(null)
})

describe('materializeSellerFinanceForOrderAction', () => {
  it('creates commission and ledger entries for paid card orders', async () => {
    mockRepo.findOrderById.mockResolvedValue(makeOrder() as never)

    const result = await materializeSellerFinanceForOrderAction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

    expect(mockRepo.createSellerFinanceEntriesForOrderItems).toHaveBeenCalledTimes(1)
    expect(mockRepo.createSellerFinanceEntriesForOrderItems).toHaveBeenCalledWith({
      items: [
        expect.objectContaining({
          orderItemId: 'item-1',
          commissionRate: expect.objectContaining({ toString: expect.any(Function) }),
          commissionAmount: expect.objectContaining({ toString: expect.any(Function) }),
          sellerNetAmount: expect.objectContaining({ toString: expect.any(Function) }),
        }),
      ],
    })
    expect(mockJobsQueue.enqueueSellerFundsReleaseJob).toHaveBeenCalledWith(
      { storeId: 'store-1' },
      expect.objectContaining({
        dedupeKey: 'seller-funds-release:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:store-1',
      }),
    )
    expect(result.createdCommissionCount).toBe(1)
    expect(result.createdLedgerEntryCount).toBe(1)
  })

  it('treats confirmed cash on delivery orders as seller actionable', async () => {
    mockRepo.findOrderById.mockResolvedValue(
      makeOrder({
        status: 'confirmed',
        payments: [{ id: 'payment-1', method: 'CASH_ON_DELIVERY', status: 'PENDING' }],
      }) as never,
    )

    const result = await materializeSellerFinanceForOrderAction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

    expect(mockRepo.createSellerFinanceEntriesForOrderItems).toHaveBeenCalledTimes(1)
    expect(result.createdLedgerEntryCount).toBe(1)
  })

  it('skips already materialized order items', async () => {
    mockRepo.findOrderById.mockResolvedValue(
      makeOrder({
        items: [
          {
            id: 'item-1',
            quantity: 2,
            storeId: 'store-1',
            unitPriceSnapshot: { toString: () => '50.00' },
            store: { id: 'store-1', ownerId: sellerUser.id, name: 'Store 1' },
            platformCommission: { id: 'commission-1' },
          },
        ],
      }) as never,
    )

    const result = await materializeSellerFinanceForOrderAction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

    expect(mockRepo.createSellerFinanceEntriesForOrderItems).not.toHaveBeenCalled()
    expect(result.createdLedgerEntryCount).toBe(0)
    expect(result.skippedOrderItemCount).toBe(1)
  })

  it('keeps historical commissions unchanged after rule updates once snapshot exists', async () => {
    mockCommissionService.calculateCommissionForAmount.mockResolvedValueOnce({
      ruleId: 'rule-1',
      ruleScope: 'GLOBAL',
      rate: '0.1000',
      commissionAmount: '10.00',
      sellerNetAmount: '90.00',
    })
    mockRepo.findOrderById.mockResolvedValueOnce(makeOrder() as never)

    await materializeSellerFinanceForOrderAction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

    mockCommissionService.calculateCommissionForAmount.mockResolvedValueOnce({
      ruleId: 'rule-2',
      ruleScope: 'STORE',
      rate: '0.2000',
      commissionAmount: '20.00',
      sellerNetAmount: '80.00',
    })
    mockRepo.findOrderById.mockResolvedValueOnce(
      makeOrder({
        items: [
          {
            id: 'item-1',
            quantity: 2,
            storeId: 'store-1',
            unitPriceSnapshot: { toString: () => '50.00' },
            variant: {
              product: {
                categoryId: 'category-1',
              },
            },
            store: { id: 'store-1', ownerId: sellerUser.id, name: 'Store 1' },
            platformCommission: { id: 'commission-1' },
          },
        ],
      }) as never,
    )

    const result = await materializeSellerFinanceForOrderAction('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

    expect(mockRepo.createSellerFinanceEntriesForOrderItems).toHaveBeenCalledTimes(1)
    expect(result.createdCommissionCount).toBe(0)
    expect(result.skippedOrderItemCount).toBe(1)
  })
})

describe('seller finance access', () => {
  it('blocks seller summary access for another seller store', async () => {
    mockRepo.findOwnedStoreById.mockResolvedValue(null)

    await expect(
      getSellerFinanceSummary(sellerUser, { storeId: 'store-foreign' }),
    ).rejects.toBeInstanceOf(PayoutOwnershipError)
  })
})

describe('manual payouts', () => {
  it('creates a payout only within exact available balance', async () => {
    mockRepo.findSellerBalanceByStoreId.mockResolvedValue(makeBalance() as never)
    mockRepo.releaseEligiblePendingLedgerEntries.mockResolvedValue(0)
    mockRepo.listReservableLedgerEntriesByStoreId.mockResolvedValue([
      {
        id: 'ledger-1',
        amount: { toString: () => '40.00' },
      },
      {
        id: 'ledger-2',
        amount: { toString: () => '50.00' },
      },
    ] as never)
    mockRepo.createManualPayout.mockResolvedValue(makePayout() as never)
    mockRepo.findPayoutById.mockResolvedValue(makePayout() as never)

    const result = await createAdminManualPayout(adminUser, {
      storeId: 'store-1',
      amount: '90.00',
      method: 'MANUAL',
    })

    expect(mockRepo.createManualPayout).toHaveBeenCalled()
    expect(result.amount).toBe('90.00')
  })

  it('rejects payout amounts above available balance', async () => {
    mockRepo.findSellerBalanceByStoreId.mockResolvedValue(makeBalance() as never)
    mockRepo.releaseEligiblePendingLedgerEntries.mockResolvedValue(0)
    mockRepo.listReservableLedgerEntriesByStoreId.mockResolvedValue([] as never)

    await expect(
      createAdminManualPayout(adminUser, {
        storeId: 'store-1',
        amount: '120.00',
        method: 'MANUAL',
      }),
    ).rejects.toBeInstanceOf(InsufficientAvailableBalanceError)
  })

  it('marks payout paid and notifies seller by email', async () => {
    mockRepo.findPayoutById
      .mockResolvedValueOnce(makePayout() as never)
      .mockResolvedValueOnce(
        makePayout({
          status: 'PAID',
          paidAt: new Date('2026-06-03T11:00:00.000Z'),
        }) as never,
      )

    const result = await updateAdminPayoutLifecycle(adminUser, 'payout-1', {
      status: 'PAID',
    })

    expect(mockRepo.markPayoutLedgerEntriesPaidOut).toHaveBeenCalledWith('payout-1')
    expect(mockEmailEvents.emitSellerPayoutPaidEmailEvent).toHaveBeenCalledWith({
      payoutId: 'payout-1',
    })
    expect(result.status).toBe('PAID')
  })

  it('releases reserved entries when payout fails', async () => {
    mockRepo.findPayoutById
      .mockResolvedValueOnce(makePayout({ status: 'PROCESSING' }) as never)
      .mockResolvedValueOnce(makePayout({ status: 'FAILED' }) as never)

    const result = await updateAdminPayoutLifecycle(adminUser, 'payout-1', {
      status: 'FAILED',
    })

    expect(mockRepo.releasePayoutLedgerEntries).toHaveBeenCalledWith('payout-1')
    expect(result.status).toBe('FAILED')
  })

  it('blocks non-admin payout creation', async () => {
    mockGuards.requireAdmin.mockImplementationOnce(() => {
      throw new Error('forbidden')
    })

    await expect(
      createAdminManualPayout(adminUser, {
        storeId: 'store-1',
        amount: '90.00',
        method: 'MANUAL',
      }),
    ).rejects.toThrow('forbidden')
    expect(mockRepo.findSellerBalanceByStoreId).not.toHaveBeenCalled()
  })
})

describe('recalculateSellerBalances', () => {
  it('releases eligible entries before recalculation', async () => {
    mockRepo.releaseEligiblePendingLedgerEntries.mockResolvedValue(2)
    mockRepo.listAdminSellerBalances.mockResolvedValue([makeBalance()] as never)

    const result = await recalculateSellerBalances(adminUser, {})

    expect(mockRepo.releaseEligiblePendingLedgerEntries).toHaveBeenCalled()
    expect(result.releasedEntryCount).toBe(2)
    expect(result.balances).toHaveLength(1)
  })
})
