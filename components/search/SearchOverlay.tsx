'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { X } from 'lucide-react'
import type { ProductSummaryDto } from '@/features/products/product.dto'
import SearchResultItem from './SearchResultItem'

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
}

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; items: ProductSummaryDto[] }
  | { status: 'error'; message: string }

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [searchState, setSearchState] = useState<SearchState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClose = () => {
    onClose()
    setQuery('')
    setSearchState({ status: 'idle' })
  }

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

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
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}&limit=10`)
      const json = await res.json()

      if (!res.ok || !json.success) {
        setSearchState({
          status: 'error',
          message: json?.error?.message ?? 'Помилка пошуку',
        })
        return
      }

      setSearchState({ status: 'success', items: json.data.data })
    } catch {
      setSearchState({ status: 'error', message: 'Помилка мережі' })
    }
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setQuery(value)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      if (value.length < 2) {
        setSearchState({ status: 'idle' })
        return
      }

      debounceTimerRef.current = setTimeout(() => {
        fetchResults(value)
      }, 300)
    },
    [fetchResults]
  )

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="ui-dialog-shell" role="dialog" aria-modal="true" aria-label="Пошук товарів">
      <div className="ui-dialog-backdrop" onClick={onClose} aria-hidden="true" />

      <div className="ui-dialog-panel">
        <div className="ui-dialog-header">
          <h2 className="text-lg font-semibold text-white">Пошук товарів</h2>
          <button onClick={handleClose} aria-label="Закрити пошук" className="ui-dialog-close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-4 shrink-0">
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
        </div>

        <div className="ui-search-results">
          {searchState.status === 'loading' && (
            <div className="flex items-center justify-center py-12" aria-live="polite" aria-label="Завантаження...">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            </div>
          )}

          {searchState.status === 'error' && (
            <div className="py-12 text-center text-sm text-white/50" role="alert">
              {searchState.message}
            </div>
          )}

          {searchState.status === 'success' && searchState.items.length === 0 && (
            <div className="py-12 text-center text-sm text-white/50" role="status">
              За вашим запитом нічого не знайдено
            </div>
          )}

          {searchState.status === 'success' && searchState.items.length > 0 && (
            <ul role="list" aria-label="Результати пошуку">
              {searchState.items.map((product) => (
                <li key={product.id}>
                  <SearchResultItem product={product} onClose={onClose} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
