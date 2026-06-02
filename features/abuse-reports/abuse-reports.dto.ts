import type {
  AbuseReportActionType,
  AbuseReportReason,
  AbuseReportStatus,
  AbuseReportTargetType,
} from '@/app/generated/prisma/client'

export interface ReportTargetPreviewDto {
  targetType: AbuseReportTargetType
  targetId: string
  productName?: string | null
  reviewSnippet?: string | null
  storeName?: string | null
  userEmailMasked?: string | null
  orderId?: string | null
}

export interface ReportActionDto {
  id: string
  reportId: string
  adminId: string
  adminName: string
  actionType: AbuseReportActionType
  note: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface ReportSummaryDto {
  id: string
  targetType: AbuseReportTargetType
  targetId: string
  reason: AbuseReportReason
  status: AbuseReportStatus
  description: string | null
  createdAt: string
  updatedAt: string
  targetPreview: ReportTargetPreviewDto | null
}

export interface ReportDetailDto extends ReportSummaryDto {
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
  actions: ReportActionDto[]
}

export interface MyReportDto {
  id: string
  targetType: AbuseReportTargetType
  targetId: string
  reason: AbuseReportReason
  status: AbuseReportStatus
  description: string | null
  resolutionNote: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  targetPreview: ReportTargetPreviewDto | null
}

export interface MyReportListDto {
  items: MyReportDto[]
  page: number
  limit: number
  total: number
}

export interface AdminReportQueueDto {
  items: ReportSummaryDto[]
  page: number
  limit: number
  total: number
}

export interface ReportMutationResultDto {
  reportId: string
  action: ReportActionDto
}
