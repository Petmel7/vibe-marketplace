'use client'

import { useEffect, useId, useState } from 'react'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import { apiClient } from '@/shared/api/api.client'
import { ApiError } from '@/shared/api/api.errors'
import type { NovaPoshtaWarehouse } from '@/types/shipping'

const warehouseResultsCache = new Map<string, NovaPoshtaWarehouse[]>()

function uniqueWarehousesByRef(warehouses: NovaPoshtaWarehouse[]) {
  const seen = new Set<string>()
  return warehouses.filter((warehouse) => {
    const normalizedRef = warehouse.ref.trim()
    if (!normalizedRef || seen.has(normalizedRef)) {
      return false
    }

    seen.add(normalizedRef)
    return true
  })
}

function getFriendlyError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Не вдалося завантажити список відділень.'
}

export default function NovaPoshtaWarehouseSelect({
  cityRef,
  value,
  onChange,
  label = 'Відділення / поштомат',
  disabled = false,
  errorMessage,
}: {
  cityRef: string | null
  value: NovaPoshtaWarehouse | null
  onChange: (warehouse: NovaPoshtaWarehouse | null) => void
  label?: string
  disabled?: boolean
  errorMessage?: string | null
}) {
  const id = useId()
  const [warehouses, setWarehouses] = useState<NovaPoshtaWarehouse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const displayedWarehouses =
    value && !warehouses.some((warehouse) => warehouse.ref === value.ref)
      ? [value, ...warehouses]
      : warehouses

  useEffect(() => {
    if (!cityRef) {
      setWarehouses([])
      setLoadError(null)
      setIsLoading(false)
      return
    }

    const normalizedCityRef = cityRef.trim()
    const cachedWarehouses = warehouseResultsCache.get(normalizedCityRef)

    if (cachedWarehouses) {
      setWarehouses(cachedWarehouses)
      setLoadError(null)
      setIsLoading(false)

      if (!cachedWarehouses.some((warehouse) => warehouse.ref === value?.ref)) {
        onChange(null)
      }

      return
    }

    let cancelled = false

    void (async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const data = await apiClient.get<NovaPoshtaWarehouse[]>(
          `${API_ROUTES.shippingNovaPoshtaWarehouses}?cityRef=${encodeURIComponent(normalizedCityRef)}`,
        )

        if (cancelled) {
          return
        }

        const uniqueWarehouses = uniqueWarehousesByRef(data)
        warehouseResultsCache.set(normalizedCityRef, uniqueWarehouses)
        setWarehouses(uniqueWarehouses)

        if (!uniqueWarehouses.some((warehouse) => warehouse.ref === value?.ref)) {
          onChange(null)
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        setWarehouses([])
        setLoadError(getFriendlyError(error))
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [cityRef, onChange, value?.ref])

  const describedBy = [loadError ? `${id}-load-error` : null, errorMessage ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-copy-strong">{label}</span>
      <select
        id={id}
        className="ui-surface-input"
        value={value?.ref ?? ''}
        onChange={(event) => {
          const nextValue = event.target.value
          const nextWarehouse =
            displayedWarehouses.find((warehouse) => warehouse.ref === nextValue) ?? null
          onChange(nextWarehouse)
        }}
        disabled={disabled || !cityRef}
        aria-busy={isLoading}
        aria-invalid={Boolean(errorMessage || loadError)}
        aria-describedby={describedBy}
      >
        <option value="">
          {!cityRef
            ? 'Спочатку оберіть місто'
            : isLoading
              ? 'Завантажуємо відділення...'
              : displayedWarehouses.length === 0
                ? 'Немає доступних відділень'
                : 'Оберіть відділення'}
        </option>
        {displayedWarehouses.map((warehouse) => (
          <option key={warehouse.ref} value={warehouse.ref}>
            {warehouse.name}
          </option>
        ))}
      </select>

      {loadError ? (
        <p id={`${id}-load-error`} className="text-sm text-brand-danger" role="alert">
          {loadError}
        </p>
      ) : null}
      {errorMessage ? (
        <p id={`${id}-error`} className="text-sm text-brand-danger" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </label>
  )
}
