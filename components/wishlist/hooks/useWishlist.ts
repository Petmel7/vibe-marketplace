'use client'

import { useCallback } from 'react'
import {
  usePathname,
  useRouter,
} from 'next/navigation'
import { toast } from 'sonner'
import {
  UnauthorizedError,
  WishlistApiError,
} from '../errors/wishlist.errors'
import { wishlistService } from '../services/wishlist.service'
import {
  optimisticToggle,
  rollbackToggle,
} from '../utils/wishlist.optimistic'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useWishlistStore } from '@/store/wishlistStore'

const AUTH_REQUIRED_MESSAGE =
  'Авторизуйтеся, щоб додати в обране'

export function useWishlist() {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useCurrentUser()

  const {
    productIds,
    pendingProductIds,
    isLoading,
    add,
    remove,
  } = useWishlistStore()

  const toggle = useCallback(
    async (productId: string) => {
      const wishlistState =
        useWishlistStore.getState()

      if (
        wishlistState.isPending(
          productId,
        )
      ) {
        return
      }

      if (!isAuthenticated) {
        toast.info(
          AUTH_REQUIRED_MESSAGE,
        )

        const next = encodeURIComponent(
          pathname || '/',
        )

        router.push(
          `/login?notice=auth-required&next=${next}`,
        )

        return
      }

      const alreadyExists =
        wishlistState.has(productId)

      wishlistState.setPending(
        productId,
        true,
      )

      optimisticToggle({
        productId,
        alreadyExists,
        add,
        remove,
      })

      try {
        await wishlistService.toggle(
          productId,
          alreadyExists,
        )

        toast.success(
          alreadyExists
            ? 'Видалено з обраного'
            : 'Додано до обраного',
        )
      } catch (error) {
        rollbackToggle({
          productId,
          alreadyExists,
          add,
          remove,
        })

        if (
          error instanceof
          UnauthorizedError
        ) {
          toast.info(
            AUTH_REQUIRED_MESSAGE,
          )

          const next = encodeURIComponent(
            pathname || '/',
          )

          router.push(
            `/login?notice=auth-required&next=${next}`,
          )

          return
        }

        if (
          error instanceof
          WishlistApiError
        ) {
          toast.error(error.message)

          return
        }

        toast.error(
          'Помилка мережі',
        )
      } finally {
        useWishlistStore.getState().setPending(
          productId,
          false,
        )
      }
    },
    [
      add,
      isAuthenticated,
      pathname,
      remove,
      router,
    ],
  )

  return {
    productIds,
    pendingProductIds,
    isLoading,
    toggle,
  }
}
