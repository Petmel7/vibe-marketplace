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
    resetState()
  }

  const resetState = () => {
    setQuery('')
    setSearchState({ status: 'idle' })
  }

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      // Small delay ensures overlay is rendered before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Close on Escape key
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

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
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
      const res = await fetch(
        `/api/products/search?q=${encodeURIComponent(searchQuery)}&limit=10`
      )
      const json = await res.json()

      if (!res.ok || !json.success) {
        setSearchState({
          status: 'error',
          message: json?.error?.message ?? 'Помилка пошуку',
        })
        return
      }

      setSearchState({ status: 'success', items: json.data.items })
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

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    // Backdrop — full screen
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Пошук товарів"
    >
      {/* Backdrop click target */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — full screen on mobile, modal on desktop */}
      <div className="relative z-10 w-full md:w-150 md:mt-20 bg-[#1D2533] md:rounded-xl shadow-2xl flex flex-col max-h-screen md:max-h-[70vh] overflow-hidden border border-white/10">
        {/* Header row */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
          <h2 className="text-white font-semibold text-lg">Пошук товарів</h2>
          <button
            onClick={handleClose}
            aria-label="Закрити пошук"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9466FF]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Search input */}
        <div className="px-6 py-4 shrink-0">
          <div className="relative">
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
              className="w-full bg-[#2A3347] text-[#E8E9EA] placeholder-white/40 rounded-lg px-4 py-3 text-sm border border-white/10 focus:outline-none focus:border-[#9466FF] focus:ring-1 focus:ring-[#9466FF] transition-colors"
            />
          </div>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {searchState.status === 'idle' && null}

          {searchState.status === 'loading' && (
            <div className="flex items-center justify-center py-12" aria-live="polite" aria-label="Завантаження...">
              <div className="w-6 h-6 rounded-full border-2 border-[#9466FF] border-t-transparent animate-spin" />
            </div>
          )}

          {searchState.status === 'error' && (
            <div className="text-center py-12 text-white/50 text-sm" role="alert">
              {searchState.message}
            </div>
          )}

          {searchState.status === 'success' && searchState.items.length === 0 && (
            <div className="text-center py-12 text-white/50 text-sm" role="status">
              Нічого не знайдено
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
