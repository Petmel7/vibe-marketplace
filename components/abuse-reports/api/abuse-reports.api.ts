'use client'

import { apiClient } from '@/shared/api/api.client'
import {
  API_ROUTES,
  getAdminReportActionsRoute,
  getAdminReportStatusRoute,
} from '@/lib/constants/apiRoutes'
import type {
  AdminReportQueueResponse,
  CreateReportActionInput,
  CreateReportInput,
  MyReportListResponse,
  ReportDetail,
  ReportMutationResponse,
  ReportSummary,
  UpdateReportStatusInput,
} from '@/types/abuse-reports'

type MyReportsQuery = {
  page?: number
  limit?: number
  status?: string
}

function buildMyReportsUrl(query: MyReportsQuery = {}) {
  const params = new URLSearchParams()

  if (typeof query.page === 'number') {
    params.set('page', String(query.page))
  }

  if (typeof query.limit === 'number') {
    params.set('limit', String(query.limit))
  }

  if (query.status) {
    params.set('status', query.status)
  }

  const search = params.toString()
  return search ? `${API_ROUTES.profileReports}?${search}` : API_ROUTES.profileReports
}

export const abuseReportsApi = {
  create(input: CreateReportInput) {
    return apiClient.post<ReportSummary>(API_ROUTES.reports, input, { auth: true })
  },

  listMine(query: MyReportsQuery = {}) {
    return apiClient.get<MyReportListResponse>(buildMyReportsUrl(query), { auth: true })
  },

  listAdmin(url: string) {
    return apiClient.get<AdminReportQueueResponse>(url, { auth: true })
  },

  getAdminDetail(url: string) {
    return apiClient.get<ReportDetail>(url, { auth: true })
  },

  updateAdminStatus(reportId: string, input: UpdateReportStatusInput) {
    return apiClient.patch<ReportDetail>(getAdminReportStatusRoute(reportId), input, { auth: true })
  },

  createAdminAction(reportId: string, input: CreateReportActionInput) {
    return apiClient.post<ReportMutationResponse>(getAdminReportActionsRoute(reportId), input, {
      auth: true,
    })
  },
}
