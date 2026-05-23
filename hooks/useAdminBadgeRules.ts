'use client'

import { useCallback, useEffect, useState } from 'react'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import type { AdminBadgeRule, AdminBadgeRuleListResponse } from '@/types/admin-badge-rules'

type ApiSuccess<T> = { success: true; data: T }
type ApiError = { success: false; error?: { message?: string } }

export function useAdminBadgeRules() {
  const [rules, setRules] = useState<AdminBadgeRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadRules = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch(API_ROUTES.adminBadgeRules, {
        method: 'GET',
        cache: 'no-store',
      })
      const json = (await response.json()) as ApiSuccess<AdminBadgeRuleListResponse> | ApiError

      if (!response.ok || !json.success) {
        setRules([])
        setErrorMessage(
          json.success
            ? 'We could not load marketplace badge rules right now.'
            : json.error?.message || 'We could not load marketplace badge rules right now.',
        )
        return
      }

      setRules(json.data.items)
    } catch {
      setRules([])
      setErrorMessage('We could not load marketplace badge rules right now.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRules()
  }, [loadRules])

  return {
    rules,
    isLoading,
    errorMessage,
    setRules,
    reloadRules: loadRules,
  }
}
