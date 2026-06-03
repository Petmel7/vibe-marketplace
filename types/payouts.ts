export const LEDGER_ENTRY_TYPES = ['CREDIT', 'DEBIT', 'HOLD', 'REFUND', 'ADJUSTMENT'] as const
export const LEDGER_ENTRY_STATUSES = ['PENDING', 'AVAILABLE', 'PAID_OUT', 'CANCELLED'] as const
export const PAYOUT_STATUSES = ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'] as const
export const PAYOUT_METHODS = ['MANUAL', 'BANK_TRANSFER'] as const

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number]
export type LedgerEntryStatus = (typeof LEDGER_ENTRY_STATUSES)[number]
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number]
export type PayoutMethod = (typeof PAYOUT_METHODS)[number]

export type SellerFinanceSummaryStore = {
  storeId: string
  storeName: string
  currency: string
  pendingAmount: string
  availableAmount: string
  paidOutAmount: string
  updatedAt: string
}

export type SellerFinanceSummary = {
  currency: string
  pendingAmount: string
  availableAmount: string
  paidOutAmount: string
  stores: SellerFinanceSummaryStore[]
}

export type SellerLedgerEntry = {
  id: string
  storeId: string
  storeName: string
  sellerId: string
  orderItemId: string | null
  payoutId: string | null
  type: LedgerEntryType
  status: LedgerEntryStatus
  amount: string
  currency: string
  description: string
  availableAt: string | null
  createdAt: string
}

export type SellerLedgerListResponse = {
  items: SellerLedgerEntry[]
  page: number
  limit: number
  total: number
}

export type SellerPayout = {
  id: string
  storeId: string
  storeName: string
  sellerId: string
  amount: string
  currency: string
  method: PayoutMethod
  status: PayoutStatus
  reference: string | null
  adminNote: string | null
  createdById: string
  paidAt: string | null
  failedAt: string | null
  createdAt: string
  updatedAt: string
  itemCount: number
}

export type SellerPayoutListResponse = {
  items: SellerPayout[]
  page: number
  limit: number
  total: number
}

export type AdminPayout = SellerPayout & {
  sellerEmail: string
  sellerName: string | null
}

export type AdminPayoutDetail = AdminPayout & {
  items: Array<{
    id: string
    ledgerEntryId: string
    amount: string
    createdAt: string
  }>
}

export type AdminPayoutListResponse = {
  items: AdminPayout[]
  page: number
  limit: number
  total: number
}

export type SellerBalance = {
  storeId: string
  storeName: string
  sellerId: string
  sellerEmail: string
  sellerName: string | null
  pendingAmount: string
  availableAmount: string
  paidOutAmount: string
  currency: string
  updatedAt: string
}

export type SellerBalanceListResponse = {
  items: SellerBalance[]
  page: number
  limit: number
  total: number
}

export type RecalculateSellerBalancesResult = {
  balances: SellerBalance[]
  releasedEntryCount: number
}

export function formatMoneyAmount(amount: string, currency = 'UAH') {
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

export function getLedgerEntryTypeLabel(type: LedgerEntryType) {
  switch (type) {
    case 'CREDIT':
      return 'Нарахування'
    case 'DEBIT':
      return 'Списання'
    case 'HOLD':
      return 'Холд'
    case 'REFUND':
      return 'Повернення'
    case 'ADJUSTMENT':
      return 'Коригування'
  }
}

export function getLedgerEntryStatusLabel(status: LedgerEntryStatus) {
  switch (status) {
    case 'PENDING':
      return 'Утримується'
    case 'AVAILABLE':
      return 'Доступно'
    case 'PAID_OUT':
      return 'Виплачено'
    case 'CANCELLED':
      return 'Скасовано'
  }
}

export function getPayoutStatusLabel(status: PayoutStatus) {
  switch (status) {
    case 'PENDING':
      return 'Очікує'
    case 'PROCESSING':
      return 'В обробці'
    case 'PAID':
      return 'Виплачено'
    case 'FAILED':
      return 'Помилка'
    case 'CANCELLED':
      return 'Скасовано'
  }
}

export function getPayoutMethodLabel(method: PayoutMethod) {
  switch (method) {
    case 'MANUAL':
      return 'Ручна виплата'
    case 'BANK_TRANSFER':
      return 'Банківський переказ'
  }
}
