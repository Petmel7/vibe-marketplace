import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/payouts/payouts.repository', () => ({
  findStoreFinanceContextById: vi.fn(),
  getLedgerBalanceTotalsByStoreId: vi.fn(),
  listSellerOwnedStoreIds: vi.fn(),
  releaseEligiblePendingLedgerEntries: vi.fn(),
  upsertSellerBalance: vi.fn(),
}))

import * as repo from '@/features/payouts/payouts.repository'
import { releaseSellerFundsForJob } from './payouts.jobs'

const mockRepo = vi.mocked(repo)

describe('payouts.jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo.findStoreFinanceContextById.mockResolvedValue({
      id: 'store-1',
      name: 'Store 1',
      ownerId: 'seller-1',
      owner: {
        id: 'seller-1',
        email: 'seller@example.com',
        name: 'Seller',
        profile: { displayName: 'Seller Display' },
      },
    } as never)
    mockRepo.getLedgerBalanceTotalsByStoreId.mockResolvedValue({
      pendingAmount: { toString: () => '10.00' },
      availableAmount: { toString: () => '90.00' },
      paidOutAmount: { toString: () => '0.00' },
    } as never)
    mockRepo.upsertSellerBalance.mockResolvedValue({ id: 'balance-1' } as never)
  })

  it('releases only eligible seller funds and refreshes affected balances', async () => {
    mockRepo.releaseEligiblePendingLedgerEntries.mockResolvedValue(2)

    const result = await releaseSellerFundsForJob({ storeId: 'store-1' })

    expect(mockRepo.releaseEligiblePendingLedgerEntries).toHaveBeenCalledWith({
      sellerId: undefined,
      storeId: 'store-1',
    })
    expect(mockRepo.upsertSellerBalance).toHaveBeenCalledOnce()
    expect(result).toEqual({
      releasedEntryCount: 2,
      refreshedBalanceCount: 1,
      storeIds: ['store-1'],
    })
  })

  it('refreshes every store owned by the seller when scheduled by seller id', async () => {
    mockRepo.releaseEligiblePendingLedgerEntries.mockResolvedValue(1)
    mockRepo.listSellerOwnedStoreIds.mockResolvedValue(['store-1', 'store-2'])
    mockRepo.findStoreFinanceContextById
      .mockResolvedValueOnce({
        id: 'store-1',
        name: 'Store 1',
        ownerId: 'seller-1',
        owner: { id: 'seller-1', email: 'seller@example.com', name: 'Seller', profile: null },
      } as never)
      .mockResolvedValueOnce({
        id: 'store-2',
        name: 'Store 2',
        ownerId: 'seller-1',
        owner: { id: 'seller-1', email: 'seller@example.com', name: 'Seller', profile: null },
      } as never)

    const result = await releaseSellerFundsForJob({ sellerId: 'seller-1' })

    expect(mockRepo.listSellerOwnedStoreIds).toHaveBeenCalledWith('seller-1')
    expect(mockRepo.upsertSellerBalance).toHaveBeenCalledTimes(2)
    expect(result.releasedEntryCount).toBe(1)
    expect(result.refreshedBalanceCount).toBe(2)
  })
})
