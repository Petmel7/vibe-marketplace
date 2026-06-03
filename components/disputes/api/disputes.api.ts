'use client'

import { apiClient } from '@/shared/api/api.client'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { ApiError, UnauthorizedError } from '@/shared/api/api.errors'
import {
  API_ROUTES,
  getAdminDisputeResolveRoute,
  getAdminDisputeStatusRoute,
  getDisputeEvidenceRoute,
  getDisputeMessagesRoute,
} from '@/lib/constants/apiRoutes'
import type {
  CreateDisputeInput,
  CreateDisputeMessageInput,
  DisputeDetail,
  DisputeListResponse,
  ResolveDisputeInput,
  UpdateDisputeStatusInput,
} from '@/types/disputes'

async function getAccessToken() {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession()

  return session?.access_token ?? null
}

async function authenticatedMultipartRequest<T>(url: string, formData: FormData): Promise<T> {
  const token = await getAccessToken()
  if (!token) {
    throw new UnauthorizedError()
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
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

function buildDisputesUrl(query: Record<string, string | number | undefined>, admin = false) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  }

  const pathname = admin ? API_ROUTES.adminDisputes : API_ROUTES.disputes
  const search = params.toString()
  return search ? `${pathname}?${search}` : pathname
}

export const disputesApi = {
  create(input: CreateDisputeInput) {
    return apiClient.post<DisputeDetail>(API_ROUTES.disputes, input, { auth: true })
  },

  listMineOrSeller(query: Record<string, string | number | undefined>) {
    return apiClient.get<DisputeListResponse>(buildDisputesUrl(query), { auth: true })
  },

  listAdmin(query: Record<string, string | number | undefined>) {
    return apiClient.get<DisputeListResponse>(buildDisputesUrl(query, true), { auth: true })
  },

  sendMessage(disputeId: string, input: CreateDisputeMessageInput) {
    return apiClient.post(getDisputeMessagesRoute(disputeId), input, { auth: true })
  },

  uploadEvidence(disputeId: string, file: File) {
    const formData = new FormData()
    formData.set('file', file)
    return authenticatedMultipartRequest(getDisputeEvidenceRoute(disputeId), formData)
  },

  updateAdminStatus(disputeId: string, input: UpdateDisputeStatusInput) {
    return apiClient.patch<DisputeDetail>(getAdminDisputeStatusRoute(disputeId), input, { auth: true })
  },

  resolveAdminDispute(disputeId: string, input: ResolveDisputeInput) {
    return apiClient.post<DisputeDetail>(getAdminDisputeResolveRoute(disputeId), input, { auth: true })
  },
}
