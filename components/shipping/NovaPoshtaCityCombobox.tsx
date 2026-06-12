'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import { apiClient } from '@/shared/api/api.client'
import { ApiError } from '@/shared/api/api.errors'
import type { NovaPoshtaCity } from '@/types/shipping'

const MIN_QUERY_LENGTH = 2
const SEARCH_DEBOUNCE_MS = 300

function formatCityOption(
  city: NovaPoshtaCity,
) {
  return [
    city.name,
    city.area,
    city.settlementType,
  ]
    .filter(Boolean)
    .join(' · ')
}

function getFriendlyError(
  error: unknown,
) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Не вдалося завантажити міста'
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
  const timerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null)
  const requestIdRef =
    useRef(0)
  const [query, setQuery] = useState(
    value?.name ?? '',
  )
  const [results, setResults] =
    useState<NovaPoshtaCity[]>(
      [],
    )
  const [isLoading, setIsLoading] =
    useState(false)
  const [loadError, setLoadError] =
    useState<string | null>(null)
  const [isFocused, setIsFocused] =
    useState(false)
  const [hasSearched, setHasSearched] =
    useState(false)

  useEffect(() => {
    setQuery(value?.name ?? '')
  }, [
    value?.ref,
    value?.name,
  ])

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const trimmedQuery =
      query.trim()
    const normalizedValueName =
      value?.name
        ?.trim()
        .toLowerCase() ?? ''
    const isExactSelection =
      Boolean(normalizedValueName) &&
      normalizedValueName ===
        trimmedQuery.toLowerCase()

    if (
      trimmedQuery.length <
        MIN_QUERY_LENGTH ||
      isExactSelection
    ) {
      setResults([])
      setLoadError(null)
      setIsLoading(false)
      setHasSearched(false)
      return
    }

    const requestId =
      ++requestIdRef.current

    setIsLoading(true)
    setLoadError(null)
    setHasSearched(false)

    timerRef.current = setTimeout(
      () => {
        void apiClient
          .get<NovaPoshtaCity[]>(
            `${API_ROUTES.shippingNovaPoshtaCities}?q=${encodeURIComponent(
              trimmedQuery,
            )}`,
          )
          .then((data) => {
            if (
              requestId !==
              requestIdRef.current
            ) {
              return
            }

            setResults(data)
            setHasSearched(true)
          })
          .catch((error) => {
            if (
              requestId !==
              requestIdRef.current
            ) {
              return
            }

            setResults([])
            setLoadError(
              getFriendlyError(
                error,
              ),
            )
            setHasSearched(true)
          })
          .finally(() => {
            if (
              requestId ===
              requestIdRef.current
            ) {
              setIsLoading(false)
            }
          })
      },
      SEARCH_DEBOUNCE_MS,
    )

    return () => {
      if (timerRef.current) {
        clearTimeout(
          timerRef.current,
        )
        timerRef.current = null
      }
    }
  }, [
    query,
    value?.name,
  ])

  const trimmedQuery =
    query.trim()
  const hasEnoughCharacters =
    trimmedQuery.length >=
    MIN_QUERY_LENGTH
  const showOptions =
    isFocused &&
    hasEnoughCharacters
  const helperTextId =
    `${id}-helper`
  const describedBy = [
    helperTextId,
    loadError
      ? `${id}-load-error`
      : null,
    errorMessage
      ? `${id}-error`
      : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <label className="relative space-y-2">
      <span className="block text-sm font-medium text-copy-strong">
        {label}
      </span>
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
        aria-invalid={Boolean(
          errorMessage ||
            loadError,
        )}
        aria-describedby={
          describedBy || undefined
        }
        onFocus={() => {
          setIsFocused(true)
        }}
        onBlur={() => {
          window.setTimeout(
            () =>
              setIsFocused(false),
            150,
          )
        }}
        onChange={(event) => {
          const nextQuery =
            event.target.value

          setQuery(nextQuery)
          setLoadError(null)

          if (
            nextQuery.trim()
              .length <
            MIN_QUERY_LENGTH
          ) {
            setResults([])
            setIsLoading(false)
            setHasSearched(false)
          }

          if (
            value &&
            value.name
              .trim()
              .toLowerCase() !==
              nextQuery
                .trim()
                .toLowerCase()
          ) {
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
            <p
              id={helperTextId}
              className="px-4 py-3 text-sm text-copy-muted"
            >
              Шукаємо місто...
            </p>
          ) : null}

          {!isLoading &&
          loadError ? (
            <p
              id={`${id}-load-error`}
              className="px-4 py-3 text-sm text-brand-danger"
              role="alert"
            >
              {loadError}
            </p>
          ) : null}

          {!isLoading &&
          !loadError &&
          !hasSearched ? (
            <p
              id={helperTextId}
              className="px-4 py-3 text-sm text-copy-muted"
            >
              Введіть щонайменше{' '}
              {MIN_QUERY_LENGTH}{' '}
              символи для пошуку міста.
            </p>
          ) : null}

          {!isLoading &&
          !loadError &&
          hasSearched &&
          results.length === 0 ? (
            <p
              id={helperTextId}
              className="px-4 py-3 text-sm text-copy-muted"
            >
              Міст не знайдено
            </p>
          ) : null}

          {!isLoading &&
          !loadError
            ? results.map((city) => (
                <button
                  key={city.ref}
                  type="button"
                  role="option"
                  aria-selected={
                    city.ref ===
                    value?.ref
                  }
                  className="flex w-full flex-col px-4 py-3 text-left transition-colors hover:bg-panel focus:bg-panel focus:outline-none"
                  onMouseDown={(
                    event,
                  ) => {
                    event.preventDefault()
                  }}
                  onClick={() => {
                    onChange(city)
                    setQuery(city.name)
                    setResults([])
                    setHasSearched(false)
                    setIsFocused(false)
                  }}
                >
                  <span className="text-sm font-medium text-copy-strong">
                    {city.name}
                  </span>
                  <span className="text-xs text-copy-muted">
                    {formatCityOption(
                      city,
                    )}
                  </span>
                </button>
              ))
            : null}
        </div>
      ) : (
        <p
          id={helperTextId}
          className="text-sm text-copy-muted"
        >
          Введіть щонайменше{' '}
          {MIN_QUERY_LENGTH}{' '}
          символи для пошуку міста.
        </p>
      )}

      {errorMessage ? (
        <p
          id={`${id}-error`}
          className="text-sm text-brand-danger"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </label>
  )
}
