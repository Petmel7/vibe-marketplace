'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { API_ROUTES, isAuthPagePath } from '@/lib/constants/apiRoutes'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useWishlistStore } from '@/store/wishlistStore'
import type { WishlistDto } from '@/features/wishlist/wishlist.dto'

let wishlistLoadPromise: Promise<void> | null = null
let wishlistRetryTimeout: ReturnType<typeof setTimeout> | null = null
let lastLoadedAccessToken: string | null = null

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
  const pathnameRef = useRef(pathname)
  const isAuthPage = isAuthPagePath(pathname)
  const { isAuthenticated, hasCompletedInitialSync } = useCurrentUser()
  const setProductIds = useWishlistStore((s) => s.setProductIds)
  const setLoading = useWishlistStore((s) => s.setLoading)
  const clear = useWishlistStore((s) => s.clear)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    let supabase: ReturnType<typeof getSupabaseBrowser>

    try {
      supabase = getSupabaseBrowser()
    } catch {
      setLoading(false)
      clear()

      return () => {
        cancelled = true
      }
    }

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
              pathname: pathnameRef.current,
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
              pathname: pathnameRef.current,
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
            pathname: pathnameRef.current,
            route: API_ROUTES.wishlist,
            code: json.error.code,
            message: json.error.message,
          })
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[WishlistAuthBridge] wishlist request threw', {
            pathname: pathnameRef.current,
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
      if (isAuthPage || !hasCompletedInitialSync) {
        return
      }

      if (!isAuthenticated) {
        lastLoadedAccessToken = null
        clear()
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        lastLoadedAccessToken = null
        clear()
        return
      }

      if (lastLoadedAccessToken === session.access_token) {
        return
      }

      if (!wishlistLoadPromise) {
        wishlistLoadPromise = loadWishlist(session.access_token).finally(() => {
          wishlistLoadPromise = null
        })
      }

      await wishlistLoadPromise
      lastLoadedAccessToken = session.access_token
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [
    clear,
    hasCompletedInitialSync,
    isAuthenticated,
    isAuthPage,
    setLoading,
    setProductIds,
  ])

  return null
}
