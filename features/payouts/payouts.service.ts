import Decimal from 'decimal.js'
import {
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
} from '@/app/generated/prisma/client'
import { calculateCommissionForAmount } from '@/features/commissions/commissions.service'
import { emitSellerPayoutPaidEmailEvent } from '@/features/email/events/email.events'
import { enqueueSellerFundsReleaseJob } from '@/features/jobs/jobs.queue'
import type { SessionUser } from '@/features/auth/auth.dto'
import { requireAdmin, requireSeller } from '@/lib/auth/guards'
import {
  InsufficientAvailableBalanceError,
  InvalidPayoutTransitionError,
  PayoutNotFoundError,
  PayoutOwnershipError,
  SellerBalanceNotFoundError,
} from '@/lib/errors/payout'
import { StoreNotFoundError } from '@/lib/errors/seller'
import { logError } from '@/utils/logger'
import type {
  AdminPayoutDetailDto,
  AdminPayoutListDto,
  AdminPayoutQueryDto,
  AdminSellerBalanceQueryDto,
  CreateAdminPayoutInputDto,
  MaterializeSellerFinanceResultDto,
  RecalculateSellerBalancesInputDto,
  RecalculateSellerBalancesResultDto,
  SellerBalanceDto,
  SellerBalanceListDto,
  SellerFinanceSummaryDto,
  SellerLedgerEntryDto,
  SellerLedgerListDto,
  SellerLedgerQueryDto,
  SellerPayoutDto,
  SellerPayoutListDto,
  SellerPayoutQueryDto,
  UpdatePayoutStatusInputDto,
} from './payouts.dto'
import {
  countAdminPayouts,
  countAdminSellerBalances,
  countSellerLedgerEntriesByOwnerId,
  countSellerPayoutsByOwnerId,
  createManualPayout,
  createSellerFinanceEntriesForOrderItems,
  findOrderById,
  findOwnedStoreById,
  findPayoutById,
  findSellerBalanceByStoreId,
  findStoreFinanceContextById,
  getLedgerBalanceTotalsByStoreId,
  listAdminPayouts,
  listAdminSellerBalances,
  listReservableLedgerEntriesByStoreId,
  listSellerBalancesByOwnerId,
  listSellerLedgerEntriesByOwnerId,
  listSellerOwnedStoreIds,
  listSellerPayoutsByOwnerId,
  markPayoutLedgerEntriesPaidOut,
  releaseEligiblePendingLedgerEntries,
  releasePayoutLedgerEntries,
  updatePayoutStatus,
  upsertSellerBalance,
} from './payouts.repository'

const DEFAULT_HOLD_DAYS = Number.parseInt(process.env.SELLER_PAYOUT_HOLD_DAYS ?? '7', 10)
const DEFAULT_CURRENCY = 'UAH'

function toIso(date: Date | null | undefined) {
  return date?.toISOString() ?? null
}

function toDisplayName(input: {
  email: string
  name?: string | null
  profile?: { displayName?: string | null } | null
}) {
  return input.profile?.displayName ?? input.name ?? input.email
}

function assertAdmin(user: SessionUser) {
  requireAdmin(user)
}

function assertSeller(user: SessionUser) {
  requireSeller(user)
}

function assertOwnedStore(
  store: Awaited<ReturnType<typeof findOwnedStoreById>>,
): asserts store is NonNullable<typeof store> {
  if (!store) {
    throw new PayoutOwnershipError()
  }
}

function getOrderPrimaryPayment(order: NonNullable<Awaited<ReturnType<typeof findOrderById>>>) {
  return order.payments[0] ?? null
}

function isOrderSellerActionable(order: NonNullable<Awaited<ReturnType<typeof findOrderById>>>) {
  const payment = getOrderPrimaryPayment(order)
  if (!payment) {
    return false
  }

  if (payment.method === PaymentMethod.CASH_ON_DELIVERY) {
    return order.status === 'confirmed'
  }

  return payment.status === PaymentStatus.SUCCEEDED && order.status === 'paid'
}

function resolveAvailableAt(now = new Date()) {
  const availableAt = new Date(now)
  availableAt.setDate(availableAt.getDate() + DEFAULT_HOLD_DAYS)
  return availableAt
}

function toSellerBalanceDto(
  balance: NonNullable<Awaited<ReturnType<typeof findSellerBalanceByStoreId>>>,
): SellerBalanceDto {
  return {
    storeId: balance.storeId,
    storeName: balance.store.name,
    sellerId: balance.sellerId,
    sellerEmail: balance.store.owner.email,
    sellerName: toDisplayName(balance.store.owner),
    pendingAmount: balance.pendingAmount.toString(),
    availableAmount: balance.availableAmount.toString(),
    paidOutAmount: balance.paidOutAmount.toString(),
    currency: balance.currency,
    updatedAt: balance.updatedAt.toISOString(),
  }
}

function toLedgerEntryDto(
  entry: Awaited<ReturnType<typeof listSellerLedgerEntriesByOwnerId>>[number],
): SellerLedgerEntryDto {
  return {
    id: entry.id,
    storeId: entry.storeId,
    storeName: entry.store.name,
    sellerId: entry.sellerId,
    orderItemId: entry.orderItemId,
    payoutId: entry.payoutId,
    type: entry.type,
    status: entry.status,
    amount: entry.amount.toString(),
    currency: entry.currency,
    description: entry.description,
    availableAt: toIso(entry.availableAt),
    createdAt: entry.createdAt.toISOString(),
  }
}

function toPayoutDto(
  payout: NonNullable<Awaited<ReturnType<typeof findPayoutById>>>,
): SellerPayoutDto {
  return {
    id: payout.id,
    storeId: payout.storeId,
    storeName: payout.store.name,
    sellerId: payout.sellerId,
    amount: payout.amount.toString(),
    currency: payout.currency,
    method: payout.method,
    status: payout.status,
    reference: payout.reference,
    adminNote: payout.adminNote,
    createdById: payout.createdById,
    paidAt: toIso(payout.paidAt),
    failedAt: toIso(payout.failedAt),
    createdAt: payout.createdAt.toISOString(),
    updatedAt: payout.updatedAt.toISOString(),
    itemCount: payout.items.length,
  }
}

function toAdminPayoutDetailDto(
  payout: NonNullable<Awaited<ReturnType<typeof findPayoutById>>>,
): AdminPayoutDetailDto {
  return {
    ...toPayoutDto(payout),
    sellerEmail: payout.seller.email,
    sellerName: toDisplayName(payout.seller),
    items: payout.items.map((item) => ({
      id: item.id,
      ledgerEntryId: item.ledgerEntryId,
      amount: item.amount.toString(),
      createdAt: item.createdAt.toISOString(),
    })),
  }
}

async function refreshSingleSellerBalance(storeId: string): Promise<SellerBalanceDto> {
  const store = await findStoreFinanceContextById(storeId)
  if (!store) {
    throw new StoreNotFoundError()
  }

  const totals = await getLedgerBalanceTotalsByStoreId(storeId)
  const balance = await upsertSellerBalance({
    storeId,
    sellerId: store.ownerId,
    currency: DEFAULT_CURRENCY,
    pendingAmount: totals.pendingAmount,
    availableAmount: totals.availableAmount,
    paidOutAmount: totals.paidOutAmount,
  })

  return toSellerBalanceDto(balance)
}

export async function materializeSellerFinanceForOrderAction(
  orderId: string,
): Promise<MaterializeSellerFinanceResultDto> {
  const order = await findOrderById(orderId)
  if (!order) {
    throw new StoreNotFoundError('Order not found for seller finance materialization')
  }

  if (!isOrderSellerActionable(order)) {
    return {
      orderId,
      createdCommissionCount: 0,
      createdLedgerEntryCount: 0,
      skippedOrderItemCount: order.items.length,
    }
  }

  const availableAt = resolveAvailableAt()
  const pendingItems = order.items.filter((item) => !item.platformCommission)
  const financeItems = await Promise.all(pendingItems.map(async (item) => {
    const grossAmount = new Decimal(item.unitPriceSnapshot.toString()).mul(item.quantity)
    const commission = await calculateCommissionForAmount({
      storeId: item.storeId,
      categoryId: item.variant.product.categoryId,
      grossAmount,
    })

    return {
      orderItemId: item.id,
      storeId: item.storeId,
      sellerId: item.store.ownerId,
      grossAmount,
      commissionRate: new Decimal(commission.rate),
      commissionAmount: new Decimal(commission.commissionAmount),
      sellerNetAmount: new Decimal(commission.sellerNetAmount),
      currency: DEFAULT_CURRENCY,
      description: `Earnings for order ${order.id.slice(0, 8)} item ${item.id.slice(0, 8)}`,
      availableAt,
    }
  }))

  if (financeItems.length === 0) {
    return {
      orderId,
      createdCommissionCount: 0,
      createdLedgerEntryCount: 0,
      skippedOrderItemCount: order.items.length,
    }
  }

  await createSellerFinanceEntriesForOrderItems({ items: financeItems })
  const affectedStoreIds = [...new Set(financeItems.map((item) => item.storeId))]
  await Promise.all(affectedStoreIds.map(refreshSingleSellerBalance))

  for (const storeId of affectedStoreIds) {
    void enqueueSellerFundsReleaseJob(
      { storeId },
      {
        runAt: availableAt,
        dedupeKey: `seller-funds-release:${order.id}:${storeId}`,
      },
    ).catch((error) => {
      logError('payouts:enqueue-seller-funds-release-job', error, {
        domain: 'payouts',
        orderId: order.id,
        storeId,
      })
    })
  }

  return {
    orderId,
    createdCommissionCount: financeItems.length,
    createdLedgerEntryCount: financeItems.length,
    skippedOrderItemCount: order.items.length - financeItems.length,
  }
}

export async function getSellerFinanceSummary(
  user: SessionUser,
  input?: { storeId?: string },
): Promise<SellerFinanceSummaryDto> {
  assertSeller(user)
  if (input?.storeId) {
    const ownedStore = await findOwnedStoreById(user.id, input.storeId)
    assertOwnedStore(ownedStore)
  }

  const balances = await listSellerBalancesByOwnerId(user.id, input?.storeId)
  const totals = balances.reduce(
    (acc, balance) => ({
      pendingAmount: acc.pendingAmount.plus(balance.pendingAmount.toString()),
      availableAmount: acc.availableAmount.plus(balance.availableAmount.toString()),
      paidOutAmount: acc.paidOutAmount.plus(balance.paidOutAmount.toString()),
    }),
    {
      pendingAmount: new Decimal(0),
      availableAmount: new Decimal(0),
      paidOutAmount: new Decimal(0),
    },
  )

  return {
    currency: DEFAULT_CURRENCY,
    pendingAmount: totals.pendingAmount.toFixed(2),
    availableAmount: totals.availableAmount.toFixed(2),
    paidOutAmount: totals.paidOutAmount.toFixed(2),
    stores: balances.map((balance) => ({
      storeId: balance.storeId,
      storeName: balance.store.name,
      currency: balance.currency,
      pendingAmount: balance.pendingAmount.toString(),
      availableAmount: balance.availableAmount.toString(),
      paidOutAmount: balance.paidOutAmount.toString(),
      updatedAt: balance.updatedAt.toISOString(),
    })),
  }
}

export async function getSellerFinanceLedger(
  user: SessionUser,
  query: SellerLedgerQueryDto,
): Promise<SellerLedgerListDto> {
  assertSeller(user)
  if (query.storeId) {
    const ownedStore = await findOwnedStoreById(user.id, query.storeId)
    assertOwnedStore(ownedStore)
  }

  const [items, total] = await Promise.all([
    listSellerLedgerEntriesByOwnerId(user.id, query),
    countSellerLedgerEntriesByOwnerId(user.id, query),
  ])

  return {
    items: items.map(toLedgerEntryDto),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function getSellerFinancePayouts(
  user: SessionUser,
  query: SellerPayoutQueryDto,
): Promise<SellerPayoutListDto> {
  assertSeller(user)
  if (query.storeId) {
    const ownedStore = await findOwnedStoreById(user.id, query.storeId)
    assertOwnedStore(ownedStore)
  }

  const [items, total] = await Promise.all([
    listSellerPayoutsByOwnerId(user.id, query),
    countSellerPayoutsByOwnerId(user.id, query),
  ])

  return {
    items: items.map((item) => toPayoutDto(item as NonNullable<Awaited<ReturnType<typeof findPayoutById>>>)),
    page: query.page,
    limit: query.limit,
    total,
  }
}

function selectLedgerEntriesForPayout(
  entries: Awaited<ReturnType<typeof listReservableLedgerEntriesByStoreId>>,
  requestedAmount: Decimal,
) {
  const selected: typeof entries = []
  let running = new Decimal(0)

  for (const entry of entries) {
    const next = running.plus(entry.amount.toString())
    if (next.greaterThan(requestedAmount)) {
      continue
    }

    selected.push(entry)
    running = next
    if (running.equals(requestedAmount)) {
      return selected
    }
  }

  return running.equals(requestedAmount) ? selected : []
}

function canTransitionPayout(from: PayoutStatus, to: PayoutStatus) {
  if (from === to) {
    return true
  }

  const transitions: Record<PayoutStatus, PayoutStatus[]> = {
    PENDING: [PayoutStatus.PROCESSING, PayoutStatus.PAID, PayoutStatus.FAILED, PayoutStatus.CANCELLED],
    PROCESSING: [PayoutStatus.PAID, PayoutStatus.FAILED, PayoutStatus.CANCELLED],
    PAID: [],
    FAILED: [],
    CANCELLED: [],
  }

  return transitions[from].includes(to)
}

export async function getAdminPayouts(
  user: SessionUser,
  query: AdminPayoutQueryDto,
): Promise<AdminPayoutListDto> {
  assertAdmin(user)
  const [items, total] = await Promise.all([listAdminPayouts(query), countAdminPayouts(query)])

  return {
    items: items.map((item) => {
      const detail = toAdminPayoutDetailDto(
        item as NonNullable<Awaited<ReturnType<typeof findPayoutById>>>,
      )

      return {
        id: detail.id,
        storeId: detail.storeId,
        storeName: detail.storeName,
        sellerId: detail.sellerId,
        amount: detail.amount,
        currency: detail.currency,
        method: detail.method,
        status: detail.status,
        reference: detail.reference,
        adminNote: detail.adminNote,
        createdById: detail.createdById,
        paidAt: detail.paidAt,
        failedAt: detail.failedAt,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
        itemCount: detail.itemCount,
        sellerEmail: detail.sellerEmail,
        sellerName: detail.sellerName,
      }
    }),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function getAdminPayoutById(
  user: SessionUser,
  payoutId: string,
): Promise<AdminPayoutDetailDto> {
  assertAdmin(user)
  const payout = await findPayoutById(payoutId)
  if (!payout) {
    throw new PayoutNotFoundError()
  }

  return toAdminPayoutDetailDto(payout)
}

export async function createAdminManualPayout(
  user: SessionUser,
  input: CreateAdminPayoutInputDto,
): Promise<AdminPayoutDetailDto> {
  assertAdmin(user)
  const balance = await findSellerBalanceByStoreId(input.storeId)
  if (!balance) {
    throw new SellerBalanceNotFoundError()
  }

  const requestedAmount = new Decimal(input.amount)
  if (requestedAmount.lte(0)) {
    throw new InsufficientAvailableBalanceError('Payout amount must be greater than zero')
  }

  await releaseEligiblePendingLedgerEntries({ storeId: input.storeId })
  await refreshSingleSellerBalance(input.storeId)

  const refreshedBalance = await findSellerBalanceByStoreId(input.storeId)
  if (!refreshedBalance) {
    throw new SellerBalanceNotFoundError()
  }

  const availableAmount = new Decimal(refreshedBalance.availableAmount.toString())
  if (requestedAmount.greaterThan(availableAmount)) {
    throw new InsufficientAvailableBalanceError()
  }

  const reservableEntries = await listReservableLedgerEntriesByStoreId(input.storeId)
  const selectedEntries = selectLedgerEntriesForPayout(reservableEntries, requestedAmount)
  if (selectedEntries.length === 0) {
    throw new InsufficientAvailableBalanceError(
      'Requested payout amount must match the sum of available seller ledger entries',
    )
  }

  const payout = await createManualPayout({
    storeId: input.storeId,
    sellerId: refreshedBalance.sellerId,
    amount: requestedAmount,
    currency: refreshedBalance.currency,
    method: input.method,
    createdById: user.id,
    reference: input.reference ?? null,
    adminNote: input.adminNote ?? null,
    ledgerEntryIds: selectedEntries.map((entry) => entry.id),
  })

  await refreshSingleSellerBalance(input.storeId)
  const fullPayout = await findPayoutById(payout.id)
  if (!fullPayout) {
    throw new PayoutNotFoundError()
  }

  return toAdminPayoutDetailDto(fullPayout)
}

export async function updateAdminPayoutLifecycle(
  user: SessionUser,
  payoutId: string,
  input: UpdatePayoutStatusInputDto,
): Promise<AdminPayoutDetailDto> {
  assertAdmin(user)
  const payout = await findPayoutById(payoutId)
  if (!payout) {
    throw new PayoutNotFoundError()
  }

  if (!canTransitionPayout(payout.status, input.status)) {
    throw new InvalidPayoutTransitionError(payout.status, input.status)
  }

  if (input.status === PayoutStatus.PAID) {
    await markPayoutLedgerEntriesPaidOut(payoutId)
  } else if (input.status === PayoutStatus.FAILED || input.status === PayoutStatus.CANCELLED) {
    await releasePayoutLedgerEntries(payoutId)
  }

  await updatePayoutStatus({
    payoutId,
    status: input.status,
    reference: input.reference,
    adminNote: input.adminNote,
    paidAt: input.status === PayoutStatus.PAID ? new Date() : payout.paidAt,
    failedAt: input.status === PayoutStatus.FAILED ? new Date() : input.status === PayoutStatus.CANCELLED ? null : payout.failedAt,
  })

  await refreshSingleSellerBalance(payout.storeId)
  const refreshed = await findPayoutById(payoutId)
  if (!refreshed) {
    throw new PayoutNotFoundError()
  }

  if (input.status === PayoutStatus.PAID) {
    void emitSellerPayoutPaidEmailEvent({ payoutId }).catch((error) => {
      logError('payouts:seller-payout-paid-email', error)
    })
  }

  return toAdminPayoutDetailDto(refreshed)
}

export async function getAdminSellerBalances(
  user: SessionUser,
  query: AdminSellerBalanceQueryDto,
): Promise<SellerBalanceListDto> {
  assertAdmin(user)
  const [items, total] = await Promise.all([
    listAdminSellerBalances(query),
    countAdminSellerBalances(query),
  ])

  return {
    items: items.map(toSellerBalanceDto),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function recalculateSellerBalances(
  user: SessionUser,
  input: RecalculateSellerBalancesInputDto,
): Promise<RecalculateSellerBalancesResultDto> {
  assertAdmin(user)
  const releasedEntryCount =
    input.releaseEligible !== false
      ? await releaseEligiblePendingLedgerEntries({
          sellerId: input.sellerId,
          storeId: input.storeId,
        })
      : 0

  const storeIds = input.storeId
    ? [input.storeId]
    : input.sellerId
      ? await listSellerOwnedStoreIds(input.sellerId)
      : (
          await listAdminSellerBalances({
            page: 1,
            limit: 1000,
            sellerId: input.sellerId,
            storeId: input.storeId,
          })
        ).map((balance) => balance.storeId)

  const balances = await Promise.all([...new Set(storeIds)].map(refreshSingleSellerBalance))

  return {
    balances,
    releasedEntryCount,
  }
}
