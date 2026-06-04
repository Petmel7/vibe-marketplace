'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import { apiClient } from '@/shared/api/api.client'
import { ApiError } from '@/shared/api/api.errors'
import type { NovaPoshtaCity } from '@/types/shipping'

function formatCityOption(city: NovaPoshtaCity) {
  return [city.name, city.area, city.settlementType].filter(Boolean).join(' · ')
}

function getFriendlyError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Не вдалося знайти міста Нова Пошта.'
}

export default function NovaPoshtaCityCombobox({
  value,
  onChange,
  label = 'Місто',
  placeholder = 'Почніть вводити місто',
  disabled = false,
  errorMessage,
}: {
  value: NovaPoshtaCity | null
  onChange: (city: NovaPoshtaCity | null) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  errorMessage?: string | null
}) {
  const id = useId()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState<NovaPoshtaCity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    const trimmedQuery = query.trim()
    const isExactSelection = value?.name?.trim().toLowerCase() === trimmedQuery.toLowerCase()

    if (trimmedQuery.length < 2 || isExactSelection) {
      return
    }

    timerRef.current = setTimeout(() => {
      setIsLoading(true)
      setLoadError(null)

      void apiClient
        .get<NovaPoshtaCity[]>(
          `${API_ROUTES.shippingNovaPoshtaCities}?q=${encodeURIComponent(trimmedQuery)}`,
        )
        .then((data) => {
          setResults(data)
        })
        .catch((error) => {
          setResults([])
          setLoadError(getFriendlyError(error))
        })
        .finally(() => {
          setIsLoading(false)
        })
    }, 350)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [query, value?.name])

  const showOptions = isFocused && query.trim().length >= 2
  const describedBy = [loadError ? `${id}-load-error` : null, errorMessage ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <label className="relative space-y-2">
      <span className="block text-sm font-medium text-copy-strong">{label}</span>
      <input
        id={id}
        type="text"
        className="ui-surface-input"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showOptions}
        aria-controls={`${id}-listbox`}
        aria-invalid={Boolean(errorMessage || loadError)}
        aria-describedby={describedBy}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          window.setTimeout(() => setIsFocused(false), 150)
        }}
        onChange={(event) => {
          const nextQuery = event.target.value
          setQuery(nextQuery)
          setLoadError(null)

          if (nextQuery.trim().length < 2) {
            setResults([])
            setIsLoading(false)
          }

          if (value && value.name.trim().toLowerCase() !== nextQuery.trim().toLowerCase()) {
            onChange(null)
          }
        }}
      />

      {showOptions ? (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-panelBorder bg-canvas shadow-card"
        >
          {isLoading ? (
            <p className="px-4 py-3 text-sm text-copy-muted">Шукаємо міста...</p>
          ) : null}
          {!isLoading && loadError ? (
            <p id={`${id}-load-error`} className="px-4 py-3 text-sm text-brand-danger" role="alert">
              {loadError}
            </p>
          ) : null}
          {!isLoading && !loadError && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-copy-muted">Міст не знайдено.</p>
          ) : null}
          {!isLoading && !loadError
            ? results.map((city) => (
                <button
                  key={city.ref}
                  type="button"
                  role="option"
                  aria-selected={city.ref === value?.ref}
                  className="flex w-full flex-col px-4 py-3 text-left transition-colors hover:bg-panel focus:bg-panel focus:outline-none"
                  onClick={() => {
                    onChange(city)
                    setQuery(city.name)
                    setResults([])
                    setIsFocused(false)
                  }}
                >
                  <span className="text-sm font-medium text-copy-strong">{city.name}</span>
                  <span className="text-xs text-copy-muted">{formatCityOption(city)}</span>
                </button>
              ))
            : null}
        </div>
      ) : null}

      {errorMessage ? (
        <p id={`${id}-error`} className="text-sm text-brand-danger" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </label>
  )
}
