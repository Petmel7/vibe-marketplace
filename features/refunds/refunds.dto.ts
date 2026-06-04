import type {
  RefundActionType,
  RefundRequestReason,
  RefundRequestStatus,
  RefundStatus,
} from '@/app/generated/prisma/client'

export type CreateRefundRequestDto = {
  orderId: string
  orderItemId: string
  amount: string
  reason: RefundRequestReason
  description?: string | null
}

export type RefundListQueryDto = {
  status?: RefundRequestStatus
  page: number
  limit: number
}

export type SellerRefundListQueryDto = RefundListQueryDto & {
  storeId?: string
}

export type AdminRefundListQueryDto = RefundListQueryDto & {
  reason?: RefundRequestReason
  requestedById?: string
  resolvedById?: string
  storeId?: string
  dateFrom?: string
  dateTo?: string
}

export type UpdateAdminRefundStatusDto = {
  status: RefundRequestStatus
  adminNote?: string | null
}

export type AdminRefundMutationNoteDto = {
  adminNote?: string | null
}

export type RefundActionDto = {
  id: string
  actionType: RefundActionType
  actorId: string
  actorName: string
  note: string | null
  createdAt: string
}

export type RefundRecordSnapshotDto = {
  id: string
  status: RefundStatus
  amount: string
  providerRefundId: string | null
  createdAt: string
  updatedAt: string
}

export type RefundRequestDto = {
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

export type RefundRequestDetailDto = RefundRequestDto & {
  eligibleAmount: string
  remainingEligibleAmount: string
  resolvedAt: string | null
  refundRecord: RefundRecordSnapshotDto | null
  actions: RefundActionDto[]
}

export type SellerRefundRequestDto = RefundRequestDto & {
  buyerName: string
}

export type AdminRefundRequestDto = RefundRequestDto & {
  requestedById: string
  requestedByName: string
  resolvedById: string | null
  resolvedByName: string | null
  adminNote: string | null
  resolvedAt: string | null
  refundRecord: RefundRecordSnapshotDto | null
  actions: RefundActionDto[]
}

export type RefundRequestListDto = {
  items: RefundRequestDto[]
  page: number
  limit: number
  total: number
}

export type SellerRefundRequestListDto = {
  items: SellerRefundRequestDto[]
  page: number
  limit: number
  total: number
}

export type AdminRefundRequestListDto = {
  items: AdminRefundRequestDto[]
  page: number
  limit: number
  total: number
}
