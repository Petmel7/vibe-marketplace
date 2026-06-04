'use client'

import { apiClient } from '@/shared/api/api.client'
import {
  API_ROUTES,
  getAdminRefundApproveRoute,
  getAdminRefundMarkFailedRoute,
  getAdminRefundMarkProcessingRoute,
  getAdminRefundMarkSucceededRoute,
  getAdminRefundRejectRoute,
  getAdminRefundStatusRoute,
} from '@/lib/constants/apiRoutes'
import type {
  AdminRefundRequest,
  CreateRefundRequestInput,
  RefundMutationNoteInput,
  RefundRequestDetail,
  UpdateRefundStatusInput,
} from '@/types/refunds'

export const refundsApi = {
  create(input: CreateRefundRequestInput) {
    return apiClient.post<RefundRequestDetail>(API_ROUTES.refunds, input, { auth: true })
  },

  updateAdminStatus(refundId: string, input: UpdateRefundStatusInput) {
    return apiClient.patch<AdminRefundRequest>(getAdminRefundStatusRoute(refundId), input, {
      auth: true,
    })
  },

  approve(refundId: string, input?: RefundMutationNoteInput) {
    return apiClient.post<AdminRefundRequest>(getAdminRefundApproveRoute(refundId), input, {
      auth: true,
    })
  },

  reject(refundId: string, input?: RefundMutationNoteInput) {
    return apiClient.post<AdminRefundRequest>(getAdminRefundRejectRoute(refundId), input, {
      auth: true,
    })
  },

  markProcessing(refundId: string, input?: RefundMutationNoteInput) {
    return apiClient.post<AdminRefundRequest>(getAdminRefundMarkProcessingRoute(refundId), input, {
      auth: true,
    })
  },

  markSucceeded(refundId: string, input?: RefundMutationNoteInput) {
    return apiClient.post<AdminRefundRequest>(getAdminRefundMarkSucceededRoute(refundId), input, {
      auth: true,
    })
  },

  markFailed(refundId: string, input?: RefundMutationNoteInput) {
    return apiClient.post<AdminRefundRequest>(getAdminRefundMarkFailedRoute(refundId), input, {
      auth: true,
    })
  },
}
