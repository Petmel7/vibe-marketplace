import type {
  PayoutMethod,
  PayoutStatus,
  SellerLedgerEntryStatus,
  SellerLedgerEntryType,
} from '@/app/generated/prisma/client'

export type SellerFinanceSummaryStoreDto = {
  storeId: string
  storeName: string
  currency: string
  pendingAmount: string
  availableAmount: string
  paidOutAmount: string
  updatedAt: string
}

export type SellerFinanceSummaryDto = {
  currency: string
  pendingAmount: string
  availableAmount: string
  paidOutAmount: string
  stores: SellerFinanceSummaryStoreDto[]
}

export type SellerLedgerEntryDto = {
  id: string
  storeId: string
  storeName: string
  sellerId: string
  orderItemId: string | null
  payoutId: string | null
  type: SellerLedgerEntryType
  status: SellerLedgerEntryStatus
  amount: string
  currency: string
  description: string
  availableAt: string | null
  createdAt: string
}

export type SellerLedgerListDto = {
  items: SellerLedgerEntryDto[]
  page: number
  limit: number
  total: number
}

export type SellerPayoutDto = {
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

export type SellerPayoutListDto = {
  items: SellerPayoutDto[]
  page: number
  limit: number
  total: number
}

export type AdminPayoutDto = SellerPayoutDto & {
  sellerEmail: string
  sellerName: string | null
}

export type AdminPayoutDetailDto = AdminPayoutDto & {
  items: Array<{
    id: string
    ledgerEntryId: string
    amount: string
    createdAt: string
  }>
}

export type AdminPayoutListDto = {
  items: AdminPayoutDto[]
  page: number
  limit: number
  total: number
}

export type SellerBalanceDto = {
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

export type SellerBalanceListDto = {
  items: SellerBalanceDto[]
  page: number
  limit: number
  total: number
}

export type CreateAdminPayoutInputDto = {
  storeId: string
  amount: string
  method: PayoutMethod
  reference?: string
  adminNote?: string
}

export type UpdatePayoutStatusInputDto = {
  status: PayoutStatus
  adminNote?: string
  reference?: string
}

export type LedgerFinanceTriggerSource =
  | 'COD_ORDER_CONFIRMED'
  | 'PAYMENT_SUCCEEDED'
  | 'MANUAL_RECALCULATION'

export type MaterializeSellerFinanceResultDto = {
  orderId: string
  createdCommissionCount: number
  createdLedgerEntryCount: number
  skippedOrderItemCount: number
}

export type RecalculateSellerBalancesInputDto = {
  sellerId?: string
  storeId?: string
  releaseEligible?: boolean
}

export type RecalculateSellerBalancesResultDto = {
  balances: SellerBalanceDto[]
  releasedEntryCount: number
}

export type SellerLedgerQueryDto = {
  page: number
  limit: number
  storeId?: string
  status?: SellerLedgerEntryStatus
  type?: SellerLedgerEntryType
  dateFrom?: string
  dateTo?: string
}

export type SellerPayoutQueryDto = {
  page: number
  limit: number
  storeId?: string
  status?: PayoutStatus
  dateFrom?: string
  dateTo?: string
}

export type AdminPayoutQueryDto = {
  page: number
  limit: number
  status?: PayoutStatus
  storeId?: string
  sellerId?: string
  dateFrom?: string
  dateTo?: string
}

export type AdminSellerBalanceQueryDto = {
  page: number
  limit: number
  storeId?: string
  sellerId?: string
}
