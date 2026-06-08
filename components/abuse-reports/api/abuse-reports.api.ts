'use client'

import { apiClient } from '@/shared/api/api.client'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { ApiError, UnauthorizedError } from '@/shared/api/api.errors'
import {
  API_ROUTES,
  getAdminReportActionsRoute,
  getAdminReportEvidenceRoute,
  getAdminReportStatusRoute,
  getReportEvidenceItemRoute,
  getReportEvidenceRoute,
} from '@/lib/constants/apiRoutes'
import type {
  AbuseReportEvidenceListResponse,
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

async function getAccessToken() {
  const {
    data: { session },
  } = await getSupabaseBrowser().auth.getSession()

  return session?.access_token ?? null
}

async function authenticatedRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken()
  if (!token) {
    throw new UnauthorizedError()
  }

  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(url, {
    ...init,
    headers,
  })

  let json:
    | { success: true; data: T }
    | { success: false; error: { message: string; code: string } }

  try {
    json = await response.json()
  } catch {
    throw new ApiError('Invalid server response', response.status)
  }

  if (!response.ok || !json.success) {
    throw new ApiError(
      json.success === false ? json.error.message : 'Request failed',
      response.status,
      json.success === false ? json.error.code : undefined,
    )
  }

  return json.data
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

  uploadEvidence(reportId: string, file: File) {
    const formData = new FormData()
    formData.set('file', file)

    return authenticatedRequest(getReportEvidenceRoute(reportId), {
      method: 'POST',
      body: formData,
    })
  },

  listMyEvidence(reportId: string) {
    return authenticatedRequest<AbuseReportEvidenceListResponse>(getReportEvidenceRoute(reportId), {
      method: 'GET',
    })
  },

  listAdminEvidence(reportId: string) {
    return authenticatedRequest<AbuseReportEvidenceListResponse>(getAdminReportEvidenceRoute(reportId), {
      method: 'GET',
    })
  },

  deleteEvidence(reportId: string, evidenceId: string) {
    return authenticatedRequest<{ id: string }>(getReportEvidenceItemRoute(reportId, evidenceId), {
      method: 'DELETE',
    })
  },
}
