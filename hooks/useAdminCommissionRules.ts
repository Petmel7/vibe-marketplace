'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminMutation } from '@/hooks/useAdminMutation'
import {
  API_ROUTES,
  getAdminCommissionRuleDetailRoute,
  getAdminCommissionRuleStatusRoute,
} from '@/lib/constants/apiRoutes'
import type { CommissionRuleDetail, CommissionRulePreview, CommissionRuleScope } from '@/types/commissions'

type CommissionRulePayload = {
  name: string
  scope: CommissionRuleScope
  storeId?: string | null
  categoryId?: string | null
  rate: string
  startsAt: string
  endsAt?: string | null
  priority?: number
  isActive?: boolean
}

type CommissionRulePreviewPayload = {
  grossAmount: string
  storeId?: string | null
  categoryId?: string | null
  at?: string | null
}

export function useAdminCommissionRules() {
  const router = useRouter()
  const mutation = useAdminMutation()
  const [isPreviewPending, setIsPreviewPending] = useState(false)
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string | null>(null)

  return {
    ...mutation,
    isPreviewPending,
    previewErrorMessage,
    createRule: (body: CommissionRulePayload) =>
      mutation.execute<CommissionRuleDetail>({
        url: API_ROUTES.adminCommissionRules,
        method: 'POST',
        body,
        successMessage: 'Commission rule created.',
        fallbackErrorMessage: 'Unable to create this commission rule right now.',
        onSuccess: async (data) => {
          router.push(`/admin/commission-rules/${data.id}`)
        },
      }),
    updateRule: (ruleId: string, body: Partial<CommissionRulePayload>) =>
      mutation.execute<CommissionRuleDetail>({
        url: getAdminCommissionRuleDetailRoute(ruleId),
        method: 'PATCH',
        body,
        successMessage: 'Commission rule updated.',
        fallbackErrorMessage: 'Unable to update this commission rule right now.',
      }),
    updateRuleStatus: (ruleId: string, isActive: boolean) =>
      mutation.execute<CommissionRuleDetail>({
        url: getAdminCommissionRuleStatusRoute(ruleId),
        method: 'PATCH',
        body: { isActive },
        successMessage: isActive ? 'Commission rule activated.' : 'Commission rule disabled.',
        fallbackErrorMessage: 'Unable to update the commission rule status right now.',
      }),
    archiveRule: (ruleId: string) =>
      mutation.execute<null>({
        url: getAdminCommissionRuleDetailRoute(ruleId),
        method: 'DELETE',
        successMessage: 'Commission rule archived.',
        fallbackErrorMessage: 'Unable to archive this commission rule right now.',
        onSuccess: async () => {
          router.push('/admin/commission-rules')
        },
      }),
    previewRule: async (body: CommissionRulePreviewPayload) => {
      setPreviewErrorMessage(null)
      setIsPreviewPending(true)

      try {
        const response = await fetch(API_ROUTES.adminCommissionRulesPreview, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        const json = (await response.json()) as
          | { success: true; data: CommissionRulePreview }
          | { success: false; error?: { message?: string } }

        if (!response.ok || !json.success) {
          setPreviewErrorMessage(
            json.success
              ? 'Unable to preview this commission rule right now.'
              : json.error?.message ?? 'Unable to preview this commission rule right now.',
          )
          return null
        }

        return json.data
      } catch {
        setPreviewErrorMessage('Unable to preview this commission rule right now.')
        return null
      } finally {
        setIsPreviewPending(false)
      }
    },
  }
}
