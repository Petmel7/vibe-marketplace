'use client'

import { useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useWishlistStore } from '@/store/wishlistStore'
import type { WishlistDto } from '@/features/wishlist/wishlist.dto'

/**
 * Mounted once at the root layout. Keeps the wishlist Zustand store in sync
 * with the Supabase auth session:
 *
 *  - On mount: hydrate the store from the current session (if any).
 *  - On SIGNED_IN: fetch and populate the wishlist.
 *  - On SIGNED_OUT: clear the wishlist store.
 *
 * Renders nothing.
 */
export default function WishlistAuthBridge() {
  const setProductIds = useWishlistStore((s) => s.setProductIds)
  const setLoading = useWishlistStore((s) => s.setLoading)
  const clear = useWishlistStore((s) => s.clear)

  useEffect(() => {
    let cancelled = false

    async function loadWishlist(token: string) {
      setLoading(true)
      try {
        const res = await fetch('/api/wishlist', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const json = (await res.json()) as
          | { success: true; data: WishlistDto }
          | { success: false; error: { message: string; code: string } }

        if (cancelled) return
        if (json.success) {
          setProductIds(json.data.items.map((i) => i.productId))
        }
      } catch {
        // Network error — leave existing state untouched.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    async function hydrate() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession()
      if (cancelled) return
      if (!session) {
        clear()
        return
      }
      await loadWishlist(session.access_token)
    }

    hydrate()

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        clear()
        return
      }
      if (event === 'SIGNED_IN') {
        loadWishlist(session.access_token)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [setProductIds, setLoading, clear])

  return null
}
