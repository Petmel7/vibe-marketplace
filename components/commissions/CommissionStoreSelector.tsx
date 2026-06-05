'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CommissionRuleStoreOption } from '@/types/commissions'

type ApiSuccess<T> = { success: true; data: T }
type ApiError = { success: false; error?: { message?: string } }

type StoreOptionsResponse = {
  items: Array<{
    id: string
    name: string
    slug: string
    ownerId: string
    ownerEmail: string | null
    isActive: boolean
  }>
  page: number
  limit: number
  total: number
}

export default function CommissionStoreSelector({
  value,
  onChange,
  initialOptions,
  required = false,
}: {
  value: string
  onChange: (value: string) => void
  initialOptions: CommissionRuleStoreOption[]
  required?: boolean
}) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<CommissionRuleStoreOption[]>(initialOptions)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? initialOptions.find((option) => option.id === value) ?? null,
    [initialOptions, options, value],
  )

  useEffect(() => {
    if (!selectedOption || options.some((option) => option.id === selectedOption.id)) {
      return
    }

    setOptions((current) => [selectedOption, ...current])
  }, [options, selectedOption])

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const searchParams = new URLSearchParams({
          limit: '20',
        })

        if (query.trim()) {
          searchParams.set('q', query.trim())
        }

        const response = await fetch(`/api/admin/stores/options?${searchParams.toString()}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        })
        const json = (await response.json()) as ApiSuccess<StoreOptionsResponse> | ApiError

        if (!response.ok || !json.success) {
          setOptions(selectedOption ? [selectedOption] : [])
          setErrorMessage(
            json.success
              ? 'We could not load stores right now.'
              : json.error?.message ?? 'We could not load stores right now.',
          )
          return
        }

        const nextOptions = json.data.items.map((item) => ({
          id: item.id,
          name: item.name,
        }))

        setOptions(() => {
          if (selectedOption && !nextOptions.some((option) => option.id === selectedOption.id)) {
            return [selectedOption, ...nextOptions]
          }

          if (!query.trim() && initialOptions.length > 0) {
            const merged = new Map<string, CommissionRuleStoreOption>()
            for (const option of [...initialOptions, ...nextOptions]) {
              merged.set(option.id, option)
            }
            return [...merged.values()]
          }

          return nextOptions
        })
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return
        }

        setOptions(selectedOption ? [selectedOption] : [])
        setErrorMessage('We could not load stores right now.')
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [initialOptions, query, selectedOption])

  const hasEmptyState = !isLoading && !errorMessage && options.length === 0

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-copy-strong">Store</span>

      <label className="space-y-2">
        <span className="sr-only">Search stores</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="ui-surface-input"
          placeholder="Search stores by name"
          aria-label="Search stores"
        />
      </label>

      <select
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ui-surface-input"
        aria-invalid={Boolean(errorMessage) || (required && !value)}
        disabled={isLoading && options.length === 0}
      >
        <option value="">{isLoading ? 'Loading stores...' : 'Select a store'}</option>
        {options.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>

      <div aria-live="polite" className="min-h-5 text-xs">
        {isLoading ? <p className="text-copy-muted">Loading store options...</p> : null}
        {errorMessage ? <p className="text-brand-danger">{errorMessage}</p> : null}
        {hasEmptyState ? <p className="text-copy-muted">No stores matched this search yet.</p> : null}
        {!isLoading && !errorMessage && selectedOption ? (
          <p className="text-copy-muted">Selected store: {selectedOption.name}</p>
        ) : null}
      </div>

      <p className="text-xs text-copy-muted">
        Store-specific rules win over category and global rules at the same priority.
      </p>
    </div>
  )
}
