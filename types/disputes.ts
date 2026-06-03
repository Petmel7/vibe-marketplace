export const DISPUTE_REASONS = [
  'ITEM_NOT_RECEIVED',
  'ITEM_NOT_AS_DESCRIBED',
  'DAMAGED_ITEM',
  'WRONG_ITEM',
  'PAYMENT_ISSUE',
  'REFUND_REQUEST',
  'SELLER_ISSUE',
  'BUYER_ISSUE',
  'OTHER',
] as const

export const DISPUTE_STATUSES = [
  'OPEN',
  'UNDER_REVIEW',
  'WAITING_BUYER',
  'WAITING_SELLER',
  'RESOLVED',
  'REJECTED',
  'ESCALATED',
  'CLOSED',
] as const

export const DISPUTE_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const
export const DISPUTE_SCOPES = ['buyer', 'seller'] as const

export type DisputeReason = (typeof DISPUTE_REASONS)[number]
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number]
export type DisputePriority = (typeof DISPUTE_PRIORITIES)[number]
export type DisputeScope = (typeof DISPUTE_SCOPES)[number]

export type DisputeMessage = {
  id: string
  senderId: string
  senderName: string
  message: string
  isInternal: boolean
  createdAt: string
}

export type DisputeEvidence = {
  id: string
  url: string
  fileName: string
  fileType: string
  fileSize: number
  createdAt: string
}

export type DisputeSummary = {
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

export type DisputeDetail = DisputeSummary & {
  openedById: string
  respondentId: string | null
  resolutionNote: string | null
  resolvedById: string | null
  resolvedAt: string | null
  messages: DisputeMessage[]
  evidence: DisputeEvidence[]
}

export type DisputeListResponse = {
  items: DisputeSummary[]
  page: number
  limit: number
  total: number
}

export type CreateDisputeInput = {
  orderId: string
  orderItemId?: string
  reason: DisputeReason
  priority?: DisputePriority
  description: string
}

export type CreateDisputeMessageInput = {
  message: string
  isInternal?: boolean
}

export type UpdateDisputeStatusInput = {
  status: Exclude<DisputeStatus, 'RESOLVED' | 'REJECTED' | 'CLOSED'>
}

export type ResolveDisputeInput = {
  status: Extract<DisputeStatus, 'RESOLVED' | 'REJECTED' | 'CLOSED'>
  resolutionNote: string
}

export function getDisputeReasonLabel(reason: DisputeReason) {
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
    case 'REFUND_REQUEST':
      return 'Запит на повернення коштів'
    case 'SELLER_ISSUE':
      return 'Проблема з продавцем'
    case 'BUYER_ISSUE':
      return 'Проблема з покупцем'
    case 'OTHER':
      return 'Інше'
  }
}

export function getDisputeStatusLabel(status: DisputeStatus) {
  switch (status) {
    case 'OPEN':
      return 'Відкрито'
    case 'UNDER_REVIEW':
      return 'На розгляді'
    case 'WAITING_BUYER':
      return 'Очікуємо покупця'
    case 'WAITING_SELLER':
      return 'Очікуємо продавця'
    case 'RESOLVED':
      return 'Вирішено'
    case 'REJECTED':
      return 'Відхилено'
    case 'ESCALATED':
      return 'Ескальовано'
    case 'CLOSED':
      return 'Закрито'
  }
}

export function getDisputePriorityLabel(priority: DisputePriority) {
  switch (priority) {
    case 'LOW':
      return 'Низький'
    case 'NORMAL':
      return 'Звичайний'
    case 'HIGH':
      return 'Високий'
    case 'URGENT':
      return 'Терміновий'
  }
}

export function isResolvedDisputeStatus(status: DisputeStatus) {
  return status === 'RESOLVED' || status === 'REJECTED' || status === 'CLOSED'
}

export function isOpenDisputeStatus(status: DisputeStatus) {
  return !isResolvedDisputeStatus(status)
}
