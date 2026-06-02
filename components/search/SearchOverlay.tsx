'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import type { ProductSearchItemDto } from '@/features/products/product.dto'
import { isRenderablePublicProduct } from '@/components/product/productListItem'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import SearchResultItem from './SearchResultItem'

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
}

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; items: ProductSearchItemDto[] }
  | { status: 'error'; message: string }

export default function SearchOverlay({
  isOpen,
  onClose,
}: SearchOverlayProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchState, setSearchState] = useState<SearchState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClose = useCallback(() => {
    onClose()
    setQuery('')
    setSearchState({ status: 'idle' })
  }, [onClose])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 50)

    return () => clearTimeout(timer)
  }, [handleClose, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose, isOpen])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSearchState({ status: 'idle' })
      return
    }

    setSearchState({ status: 'loading' })

    try {
      const response = await fetch(
        `${API_ROUTES.productSearch}?q=${encodeURIComponent(searchQuery)}&limit=10`,
      )
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        setSearchState({
          status: 'error',
          message: payload?.error?.message ?? 'Помилка пошуку',
        })
        return
      }

      setSearchState({
        status: 'success',
        items: payload.data.items.filter(isRenderablePublicProduct),
      })
    } catch {
      setSearchState({ status: 'error', message: 'Помилка мережі' })
    }
  }, [])

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setQuery(value)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      if (value.length < 2) {
        setSearchState({ status: 'idle' })
        return
      }

      debounceTimerRef.current = setTimeout(() => {
        void fetchResults(value)
      }, 300)
    },
    [fetchResults],
  )

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="ui-dialog-shell"
      role="dialog"
      aria-modal="true"
      aria-label="Пошук товарів"
    >
      <div className="ui-dialog-backdrop" onClick={handleClose} aria-hidden="true" />

      <div className="ui-dialog-panel">
        <div className="ui-dialog-header">
          <h2 className="text-lg font-semibold text-white">Пошук товарів</h2>
          <button
            onClick={handleClose}
            aria-label="Закрити пошук"
            className="ui-dialog-close"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="shrink-0 px-6 py-4">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const trimmedQuery = query.trim()

              if (!trimmedQuery) {
                return
              }

              handleClose()
              router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
            }}
          >
            <label htmlFor="search-overlay-input" className="sr-only">
              Пошук товарів
            </label>
            <input
              ref={inputRef}
              id="search-overlay-input"
              type="search"
              value={query}
              onChange={handleInputChange}
              placeholder="Пошук товарів..."
              autoComplete="off"
              className="ui-surface-input"
            />
          </form>
        </div>

        <div className="ui-search-results">
          {searchState.status === 'loading' ? (
            <div
              className="flex items-center justify-center py-12"
              aria-live="polite"
              aria-label="Завантаження результатів"
            >
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            </div>
          ) : null}

          {searchState.status === 'error' ? (
            <div className="py-12 text-center text-sm text-white/50" role="alert">
              {searchState.message}
            </div>
          ) : null}

          {searchState.status === 'success' && searchState.items.length === 0 ? (
            <div className="py-12 text-center text-sm text-white/50" role="status">
              За вашим запитом нічого не знайдено
            </div>
          ) : null}

          {searchState.status === 'success' && searchState.items.length > 0 ? (
            <ul role="list" aria-label="Результати пошуку">
              {searchState.items.map((product) => (
                <li key={product.id}>
                  <SearchResultItem product={product} onClose={handleClose} />
                </li>
              ))}
              <li className="px-4 py-3">
                <button
                  type="button"
                  className="w-full rounded-full border border-panelBorder px-4 py-3 text-sm text-copy-primary transition hover:border-white/20 hover:text-white"
                  onClick={() => {
                    const trimmedQuery = query.trim()
                    handleClose()
                    router.push(
                      trimmedQuery
                        ? `/search?q=${encodeURIComponent(trimmedQuery)}`
                        : '/search',
                    )
                  }}
                >
                  Дивитися всі результати
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}
