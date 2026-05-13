'use client'

import { useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useWishlistStore } from '@/store/wishlistStore'
import type { WishlistDto } from '../../../features/wishlist/wishlist.dto'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabaseBrowser.auth.getSession()
  return session?.access_token ?? null
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
 * Exposes wishlist state and a stable `toggle` callback.
 *
 * The initial hydration (and SIGNED_IN / SIGNED_OUT syncing) is handled by
 * `WishlistAuthBridge`, which is mounted once at the root layout. This hook
 * deliberately does NOT fetch on mount.
 *
 * `toggle` requires an authenticated session. If the user is not signed in,
 * we redirect to `/login` so the request never reaches the API unauthorised.
 */
export function useWishlist() {
  const router = useRouter()
  const pathname = usePathname()

  const { productIds, isLoading, add, remove } = useWishlistStore()

  const toggle = useCallback(
    async (productId: string) => {
      const token = await getAccessToken()
      // const token = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImJkMWFiYmMzLTIzZTYtNGZmZC1hZTNlLThhNGQwZWMxOGU1YyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lleGx0bG1waGdxZ2xpa3BiaHd6LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJlYzQzZTIwYS05NjExLTQyNzUtOTU2Zi1mZTE5OGIxOWM1NTMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc4NTcwOTk4LCJpYXQiOjE3Nzg1NjczOTgsImVtYWlsIjoibWFyaWFtZWxpY2luQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJtYXJpYW1lbGljaW5AZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiZWM0M2UyMGEtOTYxMS00Mjc1LTk1NmYtZmUxOThiMTljNTUzIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3Nzg1MTg5NzB9XSwic2Vzc2lvbl9pZCI6Ijc4ZTdiNjc1LTFlYzItNDNiNS04YjQ1LWJkN2VkYWM3MjUxOCIsImlzX2Fub255bW91cyI6ZmFsc2V9.oio_y9COOusJsnkOuH3rQp80i4A-Usp6AhM_m9sakvVHWVxDsMhKhgOjmY3cHrXddsN17pWrYNx2Kc55efLSSQ"

      if (!token) {
        toast.info('Увійдіть, щоб зберегти товар до обраного')
        const next = encodeURIComponent(pathname || '/')
        router.push(`/login?notice=auth-required&next=${next}`)
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
    [add, remove, router, pathname],
  )

  return { productIds, isLoading, toggle }
}
