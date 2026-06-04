export const REFUND_REQUEST_REASONS = [
  'ITEM_NOT_RECEIVED',
  'ITEM_NOT_AS_DESCRIBED',
  'DAMAGED_ITEM',
  'WRONG_ITEM',
  'PAYMENT_ISSUE',
  'BUYER_CHANGED_MIND',
  'SELLER_CANCELLED',
  'OTHER',
] as const

export const REFUND_REQUEST_STATUSES = [
  'REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
] as const

export const REFUND_ACTION_TYPES = [
  'CREATED',
  'STATUS_CHANGED',
  'APPROVED',
  'REJECTED',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'ADMIN_NOTE',
] as const

export const REFUND_RECORD_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
] as const

export type RefundRequestReason = (typeof REFUND_REQUEST_REASONS)[number]
export type RefundRequestStatus = (typeof REFUND_REQUEST_STATUSES)[number]
export type RefundActionType = (typeof REFUND_ACTION_TYPES)[number]
export type RefundRecordStatus = (typeof REFUND_RECORD_STATUSES)[number]

export type RefundAction = {
  id: string
  actionType: RefundActionType
  actorId: string
  actorName: string
  note: string | null
  createdAt: string
}

export type RefundRecordSnapshot = {
  id: string
  status: RefundRecordStatus
  amount: string
  providerRefundId: string | null
  createdAt: string
  updatedAt: string
}

export type RefundRequestSummary = {
  id: string
  orderId: string
  orderItemId: string | null
  paymentId: string
  reason: RefundRequestReason
  status: RefundRequestStatus
  amount: string
  currency: string
  description: string | null
  createdAt: string
  updatedAt: string
  orderStatus: string
  paymentStatus: string | null
  productName: string | null
  storeId: string | null
  storeName: string | null
}

export type RefundRequestDetail = RefundRequestSummary & {
  eligibleAmount: string
  remainingEligibleAmount: string
  resolvedAt: string | null
  refundRecord: RefundRecordSnapshot | null
  actions: RefundAction[]
}

export type SellerRefundRequest = RefundRequestSummary & {
  buyerName: string
}

export type AdminRefundRequest = RefundRequestSummary & {
  resolvedAt: string | null
  refundRecord: RefundRecordSnapshot | null
  actions: RefundAction[]
  requestedById: string
  requestedByName: string
  resolvedById: string | null
  resolvedByName: string | null
  adminNote: string | null
}

export type RefundRequestListResponse = {
  items: RefundRequestSummary[]
  page: number
  limit: number
  total: number
}

export type SellerRefundRequestListResponse = {
  items: SellerRefundRequest[]
  page: number
  limit: number
  total: number
}

export type AdminRefundRequestListResponse = {
  items: AdminRefundRequest[]
  page: number
  limit: number
  total: number
}

export type CreateRefundRequestInput = {
  orderId: string
  orderItemId: string
  amount: string
  reason: RefundRequestReason
  description?: string
}

export type UpdateRefundStatusInput = {
  status: RefundRequestStatus
  adminNote?: string
}

export type RefundMutationNoteInput = {
  adminNote?: string
}

export function getRefundReasonLabel(reason: RefundRequestReason) {
  switch (reason) {
    case 'ITEM_NOT_RECEIVED':
      return 'Товар не отримано'
    case 'ITEM_NOT_AS_DESCRIBED':
      return 'Товар не відповідає опису'
    case 'DAMAGED_ITEM':
      return 'Пошкоджений товар'
    case 'WRONG_ITEM':
      return 'Неправильний товар'
    case 'PAYMENT_ISSUE':
      return 'Проблема з оплатою'
    case 'BUYER_CHANGED_MIND':
      return 'Покупець передумав'
    case 'SELLER_CANCELLED':
      return 'Скасовано продавцем'
    case 'OTHER':
      return 'Інше'
  }
}

export function getRefundStatusLabel(status: RefundRequestStatus) {
  switch (status) {
    case 'REQUESTED':
      return 'Запит створено'
    case 'UNDER_REVIEW':
      return 'На розгляді'
    case 'APPROVED':
      return 'Схвалено'
    case 'REJECTED':
      return 'Відхилено'
    case 'PROCESSING':
      return 'В обробці'
    case 'SUCCEEDED':
      return 'Повернення підтверджено'
    case 'FAILED':
      return 'Не вдалося завершити'
    case 'CANCELLED':
      return 'Скасовано'
  }
}

export function getRefundActionLabel(actionType: RefundActionType) {
  switch (actionType) {
    case 'CREATED':
      return 'Створено'
    case 'STATUS_CHANGED':
      return 'Статус змінено'
    case 'APPROVED':
      return 'Схвалено'
    case 'REJECTED':
      return 'Відхилено'
    case 'PROCESSING':
      return 'Переведено в обробку'
    case 'SUCCEEDED':
      return 'Повернення підтверджено'
    case 'FAILED':
      return 'Повернення не вдалося'
    case 'CANCELLED':
      return 'Скасовано'
    case 'ADMIN_NOTE':
      return 'Нотатка адміністратора'
  }
}

export function getRefundRecordStatusLabel(status: RefundRecordStatus) {
  switch (status) {
    case 'PENDING':
      return 'Очікує'
    case 'PROCESSING':
      return 'В обробці'
    case 'SUCCEEDED':
      return 'Підтверджено'
    case 'FAILED':
      return 'Помилка'
    case 'CANCELLED':
      return 'Скасовано'
  }
}

export function formatRefundAmount(amount: string, currency = 'UAH') {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric)) {
    return `${amount} ${currency}`
  }

  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric)
}

export function isRefundTerminalStatus(status: RefundRequestStatus) {
  return (
    status === 'REJECTED' ||
    status === 'SUCCEEDED' ||
    status === 'FAILED' ||
    status === 'CANCELLED'
  )
}
