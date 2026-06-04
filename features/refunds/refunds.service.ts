import Decimal from 'decimal.js'
import {
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  RefundActionType,
  RefundRequestReason,
  RefundRequestStatus,
  RefundStatus,
  type Prisma,
} from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import {
  emitRefundApprovedEmailEvent,
  emitRefundFailedEmailEvent,
  emitRefundRejectedEmailEvent,
  emitRefundRequestedEmailEvents,
  emitRefundSucceededEmailEvents,
} from '@/features/email/events/email.events'
import { createAdminNotification, notifyUser } from '@/features/notifications/notifications.service'
import { applyRefundOutcome } from '@/features/payments/payment.repository'
import {
  findStoreFinanceContextById,
  getLedgerBalanceTotalsByStoreId,
  upsertSellerBalance,
} from '@/features/payouts/payouts.repository'
import { recordRefundIssuedRiskSignals } from '@/features/risk/risk.service'
import { requireAdmin, requireBuyer, requireSeller } from '@/lib/auth/guards'
import {
  DuplicateRefundRequestError,
  InvalidRefundTransitionError,
  RefundAmountExceededError,
  RefundLedgerReversalError,
  RefundOrderNotEligibleError,
  RefundPaymentNotEligibleError,
  RefundRequestNotFoundError,
  RefundRequestOwnershipError,
} from '@/lib/errors/refund'
import { logError } from '@/utils/logger'
import type {
  AdminRefundListQueryDto,
  AdminRefundMutationNoteDto,
  AdminRefundRequestDto,
  AdminRefundRequestListDto,
  CreateRefundRequestDto,
  RefundListQueryDto,
  RefundActionDto,
  RefundRecordSnapshotDto,
  RefundRequestDetailDto,
  RefundRequestDto,
  RefundRequestListDto,
  SellerRefundListQueryDto,
  SellerRefundRequestDto,
  SellerRefundRequestListDto,
  UpdateAdminRefundStatusDto,
} from './refunds.dto'
import {
  createRefundRequestRecord,
  createSellerLedgerRefundReversal,
  findActiveRefundRequestForOrderItem,
  findRefundRequestById,
  findSellerLedgerRefundReversalByDescription,
  findRefundRequestCreationContext,
  listAdminRefundRequests,
  listBuyerRefundRequests,
  listSellerRefundRequests,
  sumSucceededRefundRequestAmountsForOrderItem,
  transitionRefundRequestRecord,
  upsertRefundRecordForRequest,
  type RefundRequestRecord,
} from './refunds.repository'

const ORDER_REFUND_ELIGIBLE_STATUSES = new Set([
  'confirmed',
  'paid',
  'processing',
  'shipped',
  'delivered',
])

const CARD_PAYMENT_REFUND_ELIGIBLE_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.SUCCEEDED,
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
])

const TERMINAL_REFUND_STATUSES = new Set<RefundRequestStatus>([
  RefundRequestStatus.REJECTED,
  RefundRequestStatus.SUCCEEDED,
  RefundRequestStatus.FAILED,
  RefundRequestStatus.CANCELLED,
])

const ADMIN_STATUS_TRANSITIONS: Record<RefundRequestStatus, RefundRequestStatus[]> = {
  REQUESTED: [
    RefundRequestStatus.UNDER_REVIEW,
    RefundRequestStatus.APPROVED,
    RefundRequestStatus.REJECTED,
    RefundRequestStatus.CANCELLED,
  ],
  UNDER_REVIEW: [
    RefundRequestStatus.APPROVED,
    RefundRequestStatus.REJECTED,
    RefundRequestStatus.CANCELLED,
  ],
  APPROVED: [RefundRequestStatus.PROCESSING, RefundRequestStatus.CANCELLED],
  PROCESSING: [RefundRequestStatus.SUCCEEDED, RefundRequestStatus.FAILED],
  REJECTED: [],
  SUCCEEDED: [],
  FAILED: [],
  CANCELLED: [],
}

function buildAppUrl(path: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!appUrl) {
    return path
  }

  try {
    return new URL(path, appUrl.endsWith('/') ? appUrl : `${appUrl}/`).toString()
  } catch {
    return path
  }
}

function runNonBlocking(label: string, task: Promise<unknown>) {
  void task.catch((error) => {
    logError(label, error)
  })
}

function assertBuyerScope(user: SessionUser) {
  requireBuyer(user)
}

function assertSellerScope(user: SessionUser) {
  requireSeller(user)
}

function assertAdminScope(user: SessionUser) {
  requireAdmin(user)
}

function resolveDisplayName(person: {
  email?: string | null
  name?: string | null
  profile?: { displayName?: string | null } | null
} | null): string {
  return person?.profile?.displayName ?? person?.name ?? person?.email ?? 'Користувач'
}

function toRefundRecordSnapshotDto(record: RefundRequestRecord['refunds'][number] | null): RefundRecordSnapshotDto | null {
  if (!record) {
    return null
  }

  return {
    id: record.id,
    status: record.status,
    amount: record.amount.toString(),
    providerRefundId: record.providerRefundId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function toRefundActionDto(
  action: RefundRequestRecord['actions'][number],
  includeNote: boolean,
): RefundActionDto {
  return {
    id: action.id,
    actionType: action.actionType,
    actorId: action.actorId,
    actorName: resolveDisplayName(action.actor),
    note: includeNote ? action.note : null,
    createdAt: action.createdAt.toISOString(),
  }
}

function toRefundRequestDto(record: RefundRequestRecord): RefundRequestDto {
  return {
    id: record.id,
    orderId: record.orderId,
    orderItemId: record.orderItemId,
    paymentId: record.paymentId,
    reason: record.reason,
    status: record.status,
    amount: record.amount.toString(),
    currency: record.currency,
    description: record.description,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    orderStatus: record.order.status,
    paymentStatus: record.payment.status,
    productName: record.orderItem?.productNameSnapshot ?? null,
    storeId: record.orderItem?.storeId ?? null,
    storeName: record.orderItem?.store.name ?? record.orderItem?.storeNameSnapshot ?? null,
  }
}

async function toRefundRequestDetailDto(
  record: RefundRequestRecord,
  includeAdminData: boolean,
): Promise<RefundRequestDetailDto> {
  const { eligibleAmount, remainingEligibleAmount } = await getRefundEligibilityAmounts(record)

  return {
    ...toRefundRequestDto(record),
    eligibleAmount: eligibleAmount.toFixed(2),
    remainingEligibleAmount: remainingEligibleAmount.toFixed(2),
    resolvedAt: record.resolvedAt?.toISOString() ?? null,
    refundRecord: toRefundRecordSnapshotDto(record.refunds[0] ?? null),
    actions: record.actions.map((action) => toRefundActionDto(action, includeAdminData)),
  }
}

async function toAdminRefundRequestDto(record: RefundRequestRecord): Promise<AdminRefundRequestDto> {
  const detail = await toRefundRequestDetailDto(record, true)

  return {
    ...detail,
    requestedById: record.requestedById,
    requestedByName: resolveDisplayName(record.requestedBy),
    resolvedById: record.resolvedById,
    resolvedByName: resolveDisplayName(record.resolvedBy),
    adminNote: record.adminNote,
  }
}

function toSellerRefundRequestDto(record: RefundRequestRecord): SellerRefundRequestDto {
  return {
    ...toRefundRequestDto(record),
    buyerName: resolveDisplayName(record.requestedBy),
  }
}

function getRefundRequestOrThrow(record: RefundRequestRecord | null): RefundRequestRecord {
  if (!record) {
    throw new RefundRequestNotFoundError()
  }

  return record
}

function assertBuyerOwnsRefundRequest(user: SessionUser, record: RefundRequestRecord) {
  if (record.requestedById !== user.id) {
    throw new RefundRequestOwnershipError()
  }
}

function assertSellerOwnsRefundRequest(user: SessionUser, record: RefundRequestRecord) {
  if (record.orderItem?.store.ownerId !== user.id) {
    throw new RefundRequestOwnershipError()
  }
}

function assertRefundRequestOrderEligible(record: {
  order: { status: string }
  payment: { status: PaymentStatus; method: PaymentMethod } | null
}) {
  if (!record.payment) {
    throw new RefundPaymentNotEligibleError('A paid or confirmed payment is required for refunds')
  }

  if (!ORDER_REFUND_ELIGIBLE_STATUSES.has(record.order.status)) {
    throw new RefundOrderNotEligibleError()
  }

  if (record.payment.method === PaymentMethod.CASH_ON_DELIVERY) {
    return
  }

  if (!CARD_PAYMENT_REFUND_ELIGIBLE_STATUSES.has(record.payment.status)) {
    throw new RefundPaymentNotEligibleError()
  }
}

type RefundOrderItemContext = NonNullable<RefundRequestRecord['orderItem']>

function calculateOrderItemLineTotal(record: RefundOrderItemContext) {
  return new Decimal(record.unitPriceSnapshot.toString()).mul(record.quantity)
}

function calculateOrderPromotionTargetSubtotal(record: {
  order: RefundRequestRecord['order'] | NonNullable<Awaited<ReturnType<typeof findRefundRequestCreationContext>>>['order']
  orderItem: RefundOrderItemContext
}) {
  const promotion = record.order.orderPromotion
  if (!promotion) {
    return new Decimal(0)
  }

  const eligibleItems =
    promotion.ownerType === 'SELLER' && promotion.storeId
      ? record.order.items.filter((item) => item.storeId === promotion.storeId)
      : record.order.items

  if (!eligibleItems.some((item) => item.id === record.orderItem.id)) {
    return new Decimal(0)
  }

  return eligibleItems.reduce(
    (sum, item) =>
      sum.plus(new Decimal(item.unitPriceSnapshot.toString()).mul(item.quantity)),
    new Decimal(0),
  )
}

function calculateOrderItemDiscountAllocation(record: {
  order: RefundRequestRecord['order'] | NonNullable<Awaited<ReturnType<typeof findRefundRequestCreationContext>>>['order']
  orderItem: RefundOrderItemContext
}) {
  const promotion = record.order.orderPromotion
  if (!promotion) {
    return new Decimal(0)
  }

  const targetSubtotal = calculateOrderPromotionTargetSubtotal(record)
  if (targetSubtotal.lte(0)) {
    return new Decimal(0)
  }

  const lineTotal = calculateOrderItemLineTotal(record.orderItem)
  return new Decimal(promotion.discountAmount.toString())
    .mul(lineTotal)
    .div(targetSubtotal)
    .toDecimalPlaces(2)
}

async function getRefundEligibilityAmounts(record: RefundRequestRecord) {
  if (!record.orderItem) {
    return {
      eligibleAmount: new Decimal(0),
      remainingEligibleAmount: new Decimal(0),
    }
  }

  const lineTotal = calculateOrderItemLineTotal(record.orderItem)
  const allocatedDiscount = calculateOrderItemDiscountAllocation({
    order: record.order,
    orderItem: record.orderItem,
  })
  const eligibleAmount = Decimal.max(lineTotal.minus(allocatedDiscount), 0).toDecimalPlaces(2)
  const succeededRefundAmountRaw = await sumSucceededRefundRequestAmountsForOrderItem(record.orderItem.id)
  const succeededRefundAmount = new Decimal(succeededRefundAmountRaw?.toString() ?? '0')
  const remainingEligibleAmount = Decimal.max(
    eligibleAmount.minus(succeededRefundAmount),
    0,
  ).toDecimalPlaces(2)

  return {
    eligibleAmount,
    remainingEligibleAmount,
  }
}

async function assertRefundAmountEligible(
  context: NonNullable<Awaited<ReturnType<typeof findRefundRequestCreationContext>>>,
  requestedAmount: Decimal,
) {
  const lineTotal = calculateOrderItemLineTotal(context.orderItem)
  const allocatedDiscount = calculateOrderItemDiscountAllocation(context)
  const eligibleAmount = Decimal.max(lineTotal.minus(allocatedDiscount), 0).toDecimalPlaces(2)
  const succeededRefundAmountRaw = await sumSucceededRefundRequestAmountsForOrderItem(context.orderItem.id)
  const succeededRefundAmount = new Decimal(succeededRefundAmountRaw?.toString() ?? '0')
  const remainingEligibleAmount = Decimal.max(
    eligibleAmount.minus(succeededRefundAmount),
    0,
  ).toDecimalPlaces(2)

  if (requestedAmount.gt(remainingEligibleAmount)) {
    throw new RefundAmountExceededError(
      `Refund amount cannot exceed ${remainingEligibleAmount.toFixed(2)} ${context.payment?.currency ?? 'UAH'}`,
    )
  }

  return {
    eligibleAmount,
    remainingEligibleAmount,
  }
}

function resolveRefundActionType(status: RefundRequestStatus): RefundActionType {
  switch (status) {
    case RefundRequestStatus.APPROVED:
      return RefundActionType.APPROVED
    case RefundRequestStatus.REJECTED:
      return RefundActionType.REJECTED
    case RefundRequestStatus.PROCESSING:
      return RefundActionType.PROCESSING
    case RefundRequestStatus.SUCCEEDED:
      return RefundActionType.SUCCEEDED
    case RefundRequestStatus.FAILED:
      return RefundActionType.FAILED
    case RefundRequestStatus.CANCELLED:
      return RefundActionType.CANCELLED
    case RefundRequestStatus.UNDER_REVIEW:
    default:
      return RefundActionType.STATUS_CHANGED
  }
}

function assertRefundTransition(current: RefundRequestStatus, next: RefundRequestStatus) {
  const allowed = ADMIN_STATUS_TRANSITIONS[current] ?? []
  if (!allowed.includes(next)) {
    throw new InvalidRefundTransitionError(current, next)
  }
}

function resolveRefundRecordStatus(status: RefundRequestStatus): RefundStatus | null {
  switch (status) {
    case RefundRequestStatus.APPROVED:
      return RefundStatus.PENDING
    case RefundRequestStatus.PROCESSING:
      return RefundStatus.PROCESSING
    case RefundRequestStatus.SUCCEEDED:
      return RefundStatus.SUCCEEDED
    case RefundRequestStatus.FAILED:
      return RefundStatus.FAILED
    case RefundRequestStatus.CANCELLED:
      return RefundStatus.CANCELLED
    default:
      return null
  }
}

async function maybeSyncRefundRecord(record: RefundRequestRecord, nextStatus: RefundRequestStatus) {
  const refundStatus = resolveRefundRecordStatus(nextStatus)
  if (!refundStatus) {
    return null
  }

  return upsertRefundRecordForRequest({
    refundRequestId: record.id,
    paymentId: record.paymentId,
    orderItemId: record.orderItemId,
    status: refundStatus,
    amount: new Decimal(record.amount.toString()),
    reason: record.reason,
    providerRefundId: null,
  })
}

async function maybeApplyPaymentRefundOutcome(record: RefundRequestRecord) {
  const totalSucceededRefundAmount = record.payment.refunds.reduce(
    (sum, refund) => sum.plus(refund.amount.toString()),
    new Decimal(0),
  )
  const currentRequestAmount = new Decimal(record.amount.toString())
  const newSucceededTotal = totalSucceededRefundAmount.plus(currentRequestAmount)
  const paymentAmount = new Decimal(record.payment.amount.toString())

  await applyRefundOutcome({
    paymentId: record.paymentId,
    amount: currentRequestAmount,
    fullAmount: newSucceededTotal.greaterThanOrEqualTo(paymentAmount),
  })
}

async function maybeApplySellerLedgerReversal(record: RefundRequestRecord) {
  if (!record.orderItem?.platformCommission) {
    throw new RefundLedgerReversalError('Refund ledger reversal requires a commission snapshot')
  }

  const { eligibleAmount } = await getRefundEligibilityAmounts(record)
  if (eligibleAmount.lte(0)) {
    throw new RefundLedgerReversalError('Refund reversal amount could not be derived')
  }

  const commission = record.orderItem.platformCommission
  const refundRequestAmount = new Decimal(record.amount.toString())
  const sellerNetAmount = new Decimal(commission.sellerNetAmount.toString())
  const reversalAmount = sellerNetAmount
    .mul(refundRequestAmount)
    .div(eligibleAmount)
    .toDecimalPlaces(2)
    .negated()

  const description = `Refund reversal for request ${record.id}`
  const existing = await findSellerLedgerRefundReversalByDescription({
    orderItemId: record.orderItem.id,
    description,
  })

  if (!existing) {
    await createSellerLedgerRefundReversal({
      storeId: commission.storeId,
      sellerId: commission.sellerId,
      orderItemId: record.orderItem.id,
      amount: reversalAmount,
      currency: record.currency,
      description,
    })
  }

  const store = await findStoreFinanceContextById(commission.storeId)
  if (!store) {
    throw new RefundLedgerReversalError('Unable to resolve seller balance context')
  }

  const totals = await getLedgerBalanceTotalsByStoreId(commission.storeId)
  await upsertSellerBalance({
    storeId: commission.storeId,
    sellerId: commission.sellerId,
    currency: record.currency,
    pendingAmount: totals.pendingAmount,
    availableAmount: totals.availableAmount,
    paidOutAmount: totals.paidOutAmount,
  })

  return {
    created: !existing,
    reversalAmount: reversalAmount.toFixed(2),
  }
}

function notifyAdminsAboutRefundRequest(record: RefundRequestRecord) {
  runNonBlocking(
    'refunds:create:admin-notification',
    createAdminNotification({
      title: 'Нова заявка на повернення',
      message: `Покупець ${resolveDisplayName(record.requestedBy)} створив заявку на повернення по замовленню #${record.orderId.slice(0, 8)}.`,
      actionUrl: buildAppUrl(`/admin/refunds/${record.id}`),
      metadata: {
        refundRequestId: record.id,
        orderId: record.orderId,
        orderItemId: record.orderItemId,
        storeId: record.orderItem?.storeId ?? null,
        status: record.status,
        amount: record.amount.toString(),
        currency: record.currency,
      },
    }),
  )
}

function notifySellerAboutRefundRequested(record: RefundRequestRecord) {
  const sellerId = record.orderItem?.store.ownerId
  if (!sellerId) {
    return
  }

  runNonBlocking(
    'refunds:create:seller-notification',
    notifyUser({
      userId: sellerId,
      type: NotificationType.ADMIN_ALERT,
      title: 'Запит на повернення по замовленню',
      message: `По товару "${record.orderItem?.productNameSnapshot ?? 'товару'}" створено запит на повернення.`,
      actionUrl: buildAppUrl(`/seller/refunds/${record.id}`),
      metadata: {
        refundRequestId: record.id,
        orderId: record.orderId,
        orderItemId: record.orderItemId,
        storeId: record.orderItem?.storeId ?? null,
        amount: record.amount.toString(),
        currency: record.currency,
        status: record.status,
      },
    }),
  )
}

function notifyBuyerAboutRefundStatus(record: RefundRequestRecord) {
  if (
    record.status !== RefundRequestStatus.APPROVED &&
    record.status !== RefundRequestStatus.REJECTED &&
    record.status !== RefundRequestStatus.SUCCEEDED &&
    record.status !== RefundRequestStatus.FAILED
  ) {
    return
  }

  const titles: Record<string, string> = {
    APPROVED: 'Запит на повернення схвалено',
    REJECTED: 'Запит на повернення відхилено',
    SUCCEEDED: 'Повернення підтверджено',
    FAILED: 'Повернення не вдалося завершити',
  }

  runNonBlocking(
    'refunds:status:buyer-notification',
    notifyUser({
      userId: record.requestedById,
      type: NotificationType.ADMIN_ALERT,
      title: titles[record.status] ?? 'Оновлення повернення',
      message: `Статус вашого повернення по замовленню #${record.orderId.slice(0, 8)} змінено на ${record.status}.`,
      actionUrl: buildAppUrl(`/profile/refunds/${record.id}`),
      metadata: {
        refundRequestId: record.id,
        orderId: record.orderId,
        status: record.status,
        amount: record.amount.toString(),
        currency: record.currency,
      },
    }),
  )
}

function notifySellerAboutRefundSucceeded(record: RefundRequestRecord) {
  const sellerId = record.orderItem?.store.ownerId
  if (!sellerId || record.status !== RefundRequestStatus.SUCCEEDED) {
    return
  }

  runNonBlocking(
    'refunds:succeeded:seller-notification',
    notifyUser({
      userId: sellerId,
      type: NotificationType.ADMIN_ALERT,
      title: 'Повернення завершено',
      message: `Повернення по товару "${record.orderItem?.productNameSnapshot ?? 'товару'}" було підтверджено.`,
      actionUrl: buildAppUrl(`/seller/refunds/${record.id}`),
      metadata: {
        refundRequestId: record.id,
        orderId: record.orderId,
        orderItemId: record.orderItemId,
        storeId: record.orderItem?.storeId ?? null,
        status: record.status,
        amount: record.amount.toString(),
        currency: record.currency,
      },
    }),
  )
}

export async function createRefundRequest(
  user: SessionUser,
  input: CreateRefundRequestDto,
): Promise<RefundRequestDetailDto> {
  assertBuyerScope(user)

  if (input.reason === RefundRequestReason.OTHER && !input.description?.trim()) {
    throw new RefundOrderNotEligibleError('Description is required when reason is OTHER')
  }

  const context = await findRefundRequestCreationContext({
    orderId: input.orderId,
    orderItemId: input.orderItemId,
    userId: user.id,
  })

  if (!context) {
    throw new RefundRequestOwnershipError('You can request a refund only for your own order item')
  }

  assertRefundRequestOrderEligible(context)

  const existingActive = await findActiveRefundRequestForOrderItem(input.orderItemId)
  if (existingActive) {
    throw new DuplicateRefundRequestError()
  }

  const refundAmount = new Decimal(input.amount).toDecimalPlaces(2)
  await assertRefundAmountEligible(context, refundAmount)

  const created = await createRefundRequestRecord({
    orderId: input.orderId,
    orderItemId: input.orderItemId,
    paymentId: context.payment!.id,
    requestedById: user.id,
    reason: input.reason,
    amount: refundAmount,
    currency: context.payment!.currency,
    description: input.description ?? null,
  })

  notifyAdminsAboutRefundRequest(created)
  notifySellerAboutRefundRequested(created)
  runNonBlocking(
    'refunds:create:email-events',
    emitRefundRequestedEmailEvents({ refundRequestId: created.id }),
  )

  return toRefundRequestDetailDto(created, false)
}

export async function getMyRefundRequests(
  user: SessionUser,
  query: RefundListQueryDto,
): Promise<RefundRequestListDto> {
  assertBuyerScope(user)
  const result = await listBuyerRefundRequests(user.id, query)

  return {
    items: result.items.map(toRefundRequestDto),
    page: query.page,
    limit: query.limit,
    total: result.total,
  }
}

export async function getMyRefundRequestById(
  user: SessionUser,
  id: string,
): Promise<RefundRequestDetailDto> {
  assertBuyerScope(user)
  const record = getRefundRequestOrThrow(await findRefundRequestById(id))
  assertBuyerOwnsRefundRequest(user, record)
  return toRefundRequestDetailDto(record, false)
}

export async function getSellerRefundRequests(
  user: SessionUser,
  query: SellerRefundListQueryDto,
): Promise<SellerRefundRequestListDto> {
  assertSellerScope(user)
  const result = await listSellerRefundRequests(user.id, query)

  return {
    items: result.items.map(toSellerRefundRequestDto),
    page: query.page,
    limit: query.limit,
    total: result.total,
  }
}

export async function getSellerRefundRequestById(
  user: SessionUser,
  id: string,
): Promise<SellerRefundRequestDto> {
  assertSellerScope(user)
  const record = getRefundRequestOrThrow(await findRefundRequestById(id))
  assertSellerOwnsRefundRequest(user, record)
  return toSellerRefundRequestDto(record)
}

export async function getAdminRefundRequests(
  user: SessionUser,
  query: AdminRefundListQueryDto,
): Promise<AdminRefundRequestListDto> {
  assertAdminScope(user)
  const result = await listAdminRefundRequests(query)

  return {
    items: await Promise.all(result.items.map(toAdminRefundRequestDto)),
    page: query.page,
    limit: query.limit,
    total: result.total,
  }
}

export async function getAdminRefundRequestById(
  user: SessionUser,
  id: string,
): Promise<AdminRefundRequestDto> {
  assertAdminScope(user)
  const record = getRefundRequestOrThrow(await findRefundRequestById(id))
  return toAdminRefundRequestDto(record)
}

async function mutateAdminRefundStatus(
  user: SessionUser,
  id: string,
  nextStatus: RefundRequestStatus,
  input?: AdminRefundMutationNoteDto,
): Promise<AdminRefundRequestDto> {
  assertAdminScope(user)
  const current = getRefundRequestOrThrow(await findRefundRequestById(id))

  if (current.status === nextStatus && TERMINAL_REFUND_STATUSES.has(nextStatus)) {
    return toAdminRefundRequestDto(current)
  }

  assertRefundTransition(current.status, nextStatus)

  const now = new Date()
  const updated = await transitionRefundRequestRecord({
    id,
    status: nextStatus,
    adminNote: input?.adminNote ?? current.adminNote ?? null,
    resolvedById: TERMINAL_REFUND_STATUSES.has(nextStatus) ? user.id : null,
    resolvedAt: TERMINAL_REFUND_STATUSES.has(nextStatus) ? now : null,
    actionType: resolveRefundActionType(nextStatus),
    actorId: user.id,
    actionNote: input?.adminNote ?? null,
    metadata: {
      previousStatus: current.status,
      nextStatus,
    } as Prisma.InputJsonValue,
  })

  await maybeSyncRefundRecord(updated, nextStatus)

  if (nextStatus === RefundRequestStatus.SUCCEEDED) {
    await maybeApplyPaymentRefundOutcome(updated)
    await maybeApplySellerLedgerReversal(updated)

    const seller = updated.orderItem?.store
      ? [{ storeId: updated.orderItem.store.id, ownerId: updated.orderItem.store.ownerId }]
      : []
    runNonBlocking(
      'refunds:succeeded:risk-signal',
      recordRefundIssuedRiskSignals({
        refundId: updated.refunds[0]?.id ?? updated.id,
        orderId: updated.orderId,
        amount: updated.amount.toString(),
        reason: updated.reason,
        stores: seller,
      }),
    )
  }

  notifyBuyerAboutRefundStatus(updated)
  notifySellerAboutRefundSucceeded(updated)
  if (nextStatus === RefundRequestStatus.APPROVED) {
    runNonBlocking(
      'refunds:approved:buyer-email',
      emitRefundApprovedEmailEvent({ refundRequestId: updated.id }),
    )
  } else if (nextStatus === RefundRequestStatus.REJECTED) {
    runNonBlocking(
      'refunds:rejected:buyer-email',
      emitRefundRejectedEmailEvent({ refundRequestId: updated.id }),
    )
  } else if (nextStatus === RefundRequestStatus.SUCCEEDED) {
    runNonBlocking(
      'refunds:succeeded:email-events',
      emitRefundSucceededEmailEvents({ refundRequestId: updated.id }),
    )
  } else if (nextStatus === RefundRequestStatus.FAILED) {
    runNonBlocking(
      'refunds:failed:buyer-email',
      emitRefundFailedEmailEvent({ refundRequestId: updated.id }),
    )
  }

  return toAdminRefundRequestDto(updated)
}

export async function updateAdminRefundStatus(
  user: SessionUser,
  id: string,
  input: UpdateAdminRefundStatusDto,
): Promise<AdminRefundRequestDto> {
  return mutateAdminRefundStatus(user, id, input.status, {
    adminNote: input.adminNote ?? null,
  })
}

export async function approveAdminRefundRequest(
  user: SessionUser,
  id: string,
  input?: AdminRefundMutationNoteDto,
): Promise<AdminRefundRequestDto> {
  return mutateAdminRefundStatus(user, id, RefundRequestStatus.APPROVED, input)
}

export async function rejectAdminRefundRequest(
  user: SessionUser,
  id: string,
  input?: AdminRefundMutationNoteDto,
): Promise<AdminRefundRequestDto> {
  return mutateAdminRefundStatus(user, id, RefundRequestStatus.REJECTED, input)
}

export async function markAdminRefundRequestProcessing(
  user: SessionUser,
  id: string,
  input?: AdminRefundMutationNoteDto,
): Promise<AdminRefundRequestDto> {
  return mutateAdminRefundStatus(user, id, RefundRequestStatus.PROCESSING, input)
}

export async function markAdminRefundRequestSucceeded(
  user: SessionUser,
  id: string,
  input?: AdminRefundMutationNoteDto,
): Promise<AdminRefundRequestDto> {
  return mutateAdminRefundStatus(user, id, RefundRequestStatus.SUCCEEDED, input)
}

export async function markAdminRefundRequestFailed(
  user: SessionUser,
  id: string,
  input?: AdminRefundMutationNoteDto,
): Promise<AdminRefundRequestDto> {
  return mutateAdminRefundStatus(user, id, RefundRequestStatus.FAILED, input)
}
