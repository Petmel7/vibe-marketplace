export const ABUSE_REPORT_TARGET_TYPES = ['PRODUCT', 'REVIEW', 'STORE', 'USER', 'ORDER'] as const
export type AbuseReportTargetType = (typeof ABUSE_REPORT_TARGET_TYPES)[number]

export const ABUSE_REPORT_REASONS = [
  'SPAM',
  'SCAM',
  'COUNTERFEIT',
  'PROHIBITED_ITEM',
  'INAPPROPRIATE_CONTENT',
  'HARASSMENT',
  'MISLEADING_INFO',
  'PAYMENT_ISSUE',
  'DELIVERY_ISSUE',
  'OTHER',
] as const
export type AbuseReportReason = (typeof ABUSE_REPORT_REASONS)[number]

export const ABUSE_REPORT_STATUSES = [
  'PENDING',
  'UNDER_REVIEW',
  'RESOLVED',
  'DISMISSED',
  'ESCALATED',
] as const
export type AbuseReportStatus = (typeof ABUSE_REPORT_STATUSES)[number]

export const ABUSE_REPORT_ACTION_TYPES = [
  'NO_ACTION',
  'WARN_USER',
  'HIDE_REVIEW',
  'REJECT_PRODUCT',
  'ARCHIVE_PRODUCT',
  'SUSPEND_SELLER',
  'SUSPEND_STORE',
  'ESCALATE',
] as const
export type AbuseReportActionType = (typeof ABUSE_REPORT_ACTION_TYPES)[number]

export type AbuseReportTargetPreview = {
  targetType: AbuseReportTargetType
  targetId: string
  productName?: string | null
  reviewSnippet?: string | null
  storeName?: string | null
  userEmailMasked?: string | null
  orderId?: string | null
}

export type ReportAction = {
  id: string
  reportId: string
  adminId: string
  adminName: string
  actionType: AbuseReportActionType
  note: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type ReportSummary = {
  id: string
  targetType: AbuseReportTargetType
  targetId: string
  reason: AbuseReportReason
  status: AbuseReportStatus
  description: string | null
  createdAt: string
  updatedAt: string
  targetPreview: AbuseReportTargetPreview | null
}

export type ReportDetail = ReportSummary & {
  reporter: {
    id: string
    name: string
    emailMasked: string
  }
  assignedAdmin: {
    id: string
    name: string
  } | null
  resolvedBy: {
    id: string
    name: string
  } | null
  resolutionNote: string | null
  resolvedAt: string | null
  actions: ReportAction[]
}

export type MyReport = ReportSummary & {
  resolutionNote: string | null
  resolvedAt: string | null
}

export type MyReportListResponse = {
  items: MyReport[]
  page: number
  limit: number
  total: number
}

export type AdminReportQueueResponse = {
  items: ReportSummary[]
  page: number
  limit: number
  total: number
}

export type ReportMutationResponse = {
  reportId: string
  action: ReportAction
}

export type CreateReportInput = {
  targetType: AbuseReportTargetType
  targetId: string
  reason: AbuseReportReason
  description?: string
}

export type UpdateReportStatusInput = {
  status: AbuseReportStatus
  assignedAdminId?: string | null
  resolutionNote?: string
}

export type CreateReportActionInput = {
  actionType: AbuseReportActionType
  note?: string
  metadata?: Record<string, unknown>
}

export function isAbuseReportReason(value: string | null | undefined): value is AbuseReportReason {
  return Boolean(value && ABUSE_REPORT_REASONS.includes(value as AbuseReportReason))
}

export function isAbuseReportStatus(value: string | null | undefined): value is AbuseReportStatus {
  return Boolean(value && ABUSE_REPORT_STATUSES.includes(value as AbuseReportStatus))
}

export function isAbuseReportTargetType(value: string | null | undefined): value is AbuseReportTargetType {
  return Boolean(value && ABUSE_REPORT_TARGET_TYPES.includes(value as AbuseReportTargetType))
}
