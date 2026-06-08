import type { ReleaseSellerFundsJobPayload } from '@/features/jobs/jobs.dto'
import {
  findStoreFinanceContextById,
  getLedgerBalanceTotalsByStoreId,
  listSellerOwnedStoreIds,
  releaseEligiblePendingLedgerEntries,
  upsertSellerBalance,
} from './payouts.repository'

const DEFAULT_CURRENCY = 'UAH'

async function refreshSingleSellerBalance(storeId: string) {
  const store = await findStoreFinanceContextById(storeId)
  if (!store) {
    return null
  }

  const totals = await getLedgerBalanceTotalsByStoreId(storeId)
  return upsertSellerBalance({
    storeId,
    sellerId: store.ownerId,
    currency: DEFAULT_CURRENCY,
    pendingAmount: totals.pendingAmount,
    availableAmount: totals.availableAmount,
    paidOutAmount: totals.paidOutAmount,
  })
}

export async function releaseSellerFundsForJob(input: ReleaseSellerFundsJobPayload) {
  const releasedEntryCount = await releaseEligiblePendingLedgerEntries({
    sellerId: input.sellerId ?? undefined,
    storeId: input.storeId ?? undefined,
  })

  const storeIds = input.storeId
    ? [input.storeId]
    : input.sellerId
      ? await listSellerOwnedStoreIds(input.sellerId)
      : []

  const refreshedBalances = (
    await Promise.all([...new Set(storeIds)].map(refreshSingleSellerBalance))
  ).filter(Boolean)

  return {
    releasedEntryCount,
    refreshedBalanceCount: refreshedBalances.length,
    storeIds,
  }
}
