import type {
  DisputePriority,
  DisputeReason,
  DisputeStatus,
} from '@/app/generated/prisma/client'

export type DisputeScope = 'buyer' | 'seller'

export const DISPUTE_EVIDENCE_BUCKET = 'dispute-evidence' as const

export interface DisputeMessageDto {
  id: string
  senderId: string
  senderName: string
  message: string
  isInternal: boolean
  createdAt: string
}

export interface DisputeEvidenceDto {
  id: string
  url: string
  fileName: string
  fileType: string
  fileSize: number
  createdAt: string
}

export interface DisputeSummaryDto {
  id: string
  orderId: string
  orderItemId: string | null
  storeId: string | null
  reason: DisputeReason
  status: DisputeStatus
  priority: DisputePriority
  description: string
  createdAt: string
  updatedAt: string
  orderStatus: string
  paymentStatus: string | null
  productName: string | null
  storeName: string | null
}

export interface DisputeDetailDto extends DisputeSummaryDto {
  openedById: string
  respondentId: string | null
  resolutionNote: string | null
  resolvedById: string | null
  resolvedAt: string | null
  messages: DisputeMessageDto[]
  evidence: DisputeEvidenceDto[]
}

export interface DisputeListDto {
  items: DisputeSummaryDto[]
  page: number
  limit: number
  total: number
}

export interface CreateDisputeDto {
  orderId: string
  orderItemId?: string
  reason: DisputeReason
  priority?: DisputePriority
  description: string
}

export interface CreateDisputeMessageDto {
  message: string
  isInternal?: boolean
}

export interface UpdateDisputeStatusDto {
  status: Exclude<DisputeStatus, 'RESOLVED' | 'REJECTED' | 'CLOSED'>
}

export interface ResolveDisputeDto {
  status: Extract<DisputeStatus, 'RESOLVED' | 'REJECTED' | 'CLOSED'>
  resolutionNote: string
}

export interface DisputeListQueryDto {
  page: number
  limit: number
  status?: DisputeStatus
  scope?: DisputeScope
}

export interface AdminDisputeListQueryDto extends DisputeListQueryDto {
  reason?: DisputeReason
  priority?: DisputePriority
  storeId?: string
  dateFrom?: string
  dateTo?: string
}
