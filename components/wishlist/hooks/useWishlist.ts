'use client'

import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useWishlistStore } from '@/store/wishlistStore'
import type { WishlistDto } from '../../../features/wishlist/wishlist.dto'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabaseBrowser.auth.getSession()
  return data.session?.access_token ?? null
}

async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<{ success: true; data: T } | { success: false; error: { message: string; code: string } }> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })
  return res.json()
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Initialises the wishlist for the current session and exposes a stable
 * `toggle` callback.
 *
 * - Fetches the wishlist once on mount (if the user is authenticated).
 * - Provides optimistic add/remove with automatic rollback on failure.
 * - Shows sonner toasts for success, error, and unauthenticated states.
 */
export function useWishlist() {
  const { productIds, isLoading, setProductIds, add, remove, setLoading } =
    useWishlistStore()

  const initialised = useRef(false)

  // ── Initial fetch ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (initialised.current) return
    initialised.current = true

    async function load() {
      const token = await getAccessToken()
      if (!token) return // not logged in — empty wishlist is fine

      setLoading(true)
      try {
        const json = await apiFetch<WishlistDto>('/api/wishlist', token)
        if (json.success) {
          setProductIds(json.data.items.map((i) => i.productId))
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [setProductIds, setLoading])

  // ── Toggle ─────────────────────────────────────────────────────────────────

  const toggle = useCallback(
    async (productId: string) => {
      const token = await getAccessToken()

      if (!token) {
        toast.info('Увійдіть, щоб зберегти товар до обраного')
        return
      }

      const alreadyIn = useWishlistStore.getState().has(productId)

      // Optimistic update
      if (alreadyIn) {
        remove(productId)
      } else {
        add(productId)
      }

      try {
        if (alreadyIn) {
          const json = await apiFetch<WishlistDto>(
            `/api/wishlist/${productId}`,
            token,
            { method: 'DELETE' },
          )
          if (!json.success) {
            add(productId) // rollback
            toast.error('Не вдалося видалити з обраного')
          } else {
            toast.success('Видалено з обраного')
          }
        } else {
          const json = await apiFetch<WishlistDto>('/api/wishlist', token, {
            method: 'POST',
            body: JSON.stringify({ productId }),
          })
          if (!json.success) {
            remove(productId) // rollback
            toast.error('Не вдалося додати до обраного')
          } else {
            toast.success('Додано до обраного')
          }
        }
      } catch {
        // Network error — rollback
        if (alreadyIn) {
          add(productId)
        } else {
          remove(productId)
        }
        toast.error('Помилка мережі')
      }
    },
    [add, remove],
  )

  return { productIds, isLoading, toggle }
}
