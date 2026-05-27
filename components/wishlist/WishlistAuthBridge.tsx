'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { API_ROUTES, isAuthPagePath } from '@/lib/constants/apiRoutes'
import { useWishlistStore } from '@/store/wishlistStore'
import type { WishlistDto } from '@/features/wishlist/wishlist.dto'

let wishlistLoadPromise: Promise<void> | null = null
let wishlistRetryTimeout: ReturnType<typeof setTimeout> | null = null

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
  const pathname = usePathname()
  const setProductIds = useWishlistStore((s) => s.setProductIds)
  const setLoading = useWishlistStore((s) => s.setLoading)
  const clear = useWishlistStore((s) => s.clear)

  useEffect(() => {
    let cancelled = false

    async function loadWishlist(token: string, allowRetry = true) {
      setLoading(true)

      try {
        const res = await fetch(API_ROUTES.wishlist, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })

        if (cancelled) return

        if (res.status === 401) {
          clear()
          return
        }

        if (res.status === 404) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[WishlistAuthBridge] wishlist route unavailable', {
              pathname,
              route: API_ROUTES.wishlist,
              status: res.status,
            })
          }

          if (process.env.NODE_ENV !== 'production' && allowRetry && !wishlistRetryTimeout) {
            wishlistRetryTimeout = setTimeout(() => {
              wishlistRetryTimeout = null
              wishlistLoadPromise = loadWishlist(token, false).finally(() => {
                wishlistLoadPromise = null
              })
            }, 500)
          }

          return
        }

        if (!res.ok) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[WishlistAuthBridge] wishlist request failed', {
              pathname,
              route: API_ROUTES.wishlist,
              status: res.status,
            })
          }
          return
        }

        const json = (await res.json()) as
          | { success: true; data: WishlistDto }
          | { success: false; error: { message: string; code: string } }

        if (cancelled) return

        if (json.success) {
          setProductIds(json.data.items.map((item) => item.productId))
          return
        }

        if (process.env.NODE_ENV !== 'production') {
          console.warn('[WishlistAuthBridge] wishlist response error', {
            pathname,
            route: API_ROUTES.wishlist,
            code: json.error.code,
            message: json.error.message,
          })
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[WishlistAuthBridge] wishlist request threw', {
            pathname,
            route: API_ROUTES.wishlist,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    async function hydrate() {
      if (isAuthPagePath(pathname)) {
        return
      }

      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession()

      if (cancelled) return

      if (!session) {
        clear()
        return
      }

      if (!wishlistLoadPromise) {
        wishlistLoadPromise = loadWishlist(session.access_token).finally(() => {
          wishlistLoadPromise = null
        })
      }

      await wishlistLoadPromise
    }

    void hydrate()

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        clear()
        return
      }

      if (event === 'SIGNED_IN') {
        if (!wishlistLoadPromise) {
          wishlistLoadPromise = loadWishlist(session.access_token).finally(() => {
            wishlistLoadPromise = null
          })
        }
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [clear, pathname, setLoading, setProductIds])

  return null
}
