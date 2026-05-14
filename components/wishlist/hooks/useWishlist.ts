
'use client'

import { useCallback } from 'react'

import {
  usePathname,
  useRouter,
} from 'next/navigation'

import { toast } from 'sonner'

import { wishlistService } from '../services/wishlist.service'

import {
  UnauthorizedError,
  WishlistApiError,
} from '../errors/wishlist.errors'

import {
  optimisticToggle,
  rollbackToggle,
} from '../utils/wishlist.optimistic'

import { useWishlistStore } from '@/store/wishlistStore'

export function useWishlist() {
  const router = useRouter()
  const pathname = usePathname()

  const {
    productIds,
    isLoading,
    add,
    remove,
    has,
  } = useWishlistStore()

  const toggle = useCallback(
    async (productId: string) => {
      const alreadyExists = has(productId)

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

        if (error instanceof UnauthorizedError) {
          toast.info(
            'Увійдіть, щоб зберегти товар до обраного',
          )

          const next = encodeURIComponent(
            pathname || '/',
          )

          router.push(
            `/login?notice=auth-required&next=${next}`,
          )

          return
        }

        if (error instanceof WishlistApiError) {
          toast.error(error.message)

          return
        }

        toast.error('Помилка мережі')
      }
    },
    [
      add,
      remove,
      has,
      pathname,
      router,
    ],
  )

  return {
    productIds,
    isLoading,
    toggle,
  }
}