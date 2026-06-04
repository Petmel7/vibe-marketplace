'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import { apiClient } from '@/shared/api/api.client'
import { ApiError } from '@/shared/api/api.errors'
import type { StoreShippingSettings } from '@/types/shipping'

type ShippingSettingsPayload = {
  senderName: string | null
  senderPhone: string | null
  senderCityRef: string | null
  senderCityName: string | null
  senderWarehouseRef: string | null
  senderWarehouseName: string | null
}

function getFriendlyError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export function useSellerStoreShippingSettings(enabled = true) {
  const [settings, setSettings] = useState<StoreShippingSettings | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    if (!enabled) {
      setSettings(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const data = await apiClient.get<StoreShippingSettings>(API_ROUTES.sellerStoreShippingSettings)
      setSettings(data)
    } catch (error) {
      setErrorMessage(
        getFriendlyError(error, 'Не вдалося завантажити налаштування відправника.'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const saveSettings = useCallback(async (payload: ShippingSettingsPayload) => {
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const data = await apiClient.patch<StoreShippingSettings>(
        API_ROUTES.sellerStoreShippingSettings,
        payload,
      )
      setSettings(data)
      toast.success('Налаштування доставки збережено.')
      return data
    } catch (error) {
      const message = getFriendlyError(
        error,
        'Не вдалося зберегти налаштування відправника.',
      )
      setErrorMessage(message)
      toast.error(message)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [])

  return {
    settings,
    isLoading,
    isSaving,
    errorMessage,
    reloadSettings: loadSettings,
    saveSettings,
  }
}
