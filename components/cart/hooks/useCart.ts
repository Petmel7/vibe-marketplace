import { useCallback, useEffect, useRef, useState } from 'react'

import {
    fetchCart,
    removeCartItem,
    updateCartItem,
} from '../api/cart.api'

import {
    withItemRemoved,
    withQuantityUpdate,
} from '../utils/cart.utils'

import { useCartStore } from '@/store/cartStore'

import type { CartDto } from '@/features/cart/cart.dto'

export function useCart() {
    const setItemCount = useCartStore((s) => s.setItemCount)

    const [cart, setCart] = useState<CartDto | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadingItemIds, setLoadingItemIds] = useState<Set<string>>(new Set())

    const sessionIdRef = useRef('')

    useEffect(() => {
        sessionIdRef.current = useCartStore.getState().ensureSessionId()

        let cancelled = false

        async function loadCart() {
            try {
                const json = await fetchCart(sessionIdRef.current)

                if (!cancelled && json.success) {
                    setCart(json.data)
                    setItemCount(json.data.itemCount)
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        loadCart()

        return () => {
            cancelled = true
        }
    }, [setItemCount])

    const handleUpdateQuantity = useCallback(
        async (itemId: string, quantity: number) => {
            if (!cart) return

            const prevCart = cart
            const optimisticCart = withQuantityUpdate(cart, itemId, quantity)

            setCart(optimisticCart)
            setItemCount(optimisticCart.itemCount)

            setLoadingItemIds((ids) => new Set([...ids, itemId]))

            try {
                const json = await updateCartItem(
                    sessionIdRef.current,
                    itemId,
                    quantity,
                )

                if (json.success) {
                    setCart(json.data)
                    setItemCount(json.data.itemCount)
                } else {
                    setCart(prevCart)
                    setItemCount(prevCart.itemCount)
                }
            } catch {
                setCart(prevCart)
                setItemCount(prevCart.itemCount)
            } finally {
                setLoadingItemIds((ids) => {
                    const next = new Set(ids)

                    next.delete(itemId)

                    return next
                })
            }
        },
        [cart, setItemCount],
    )

    const handleRemoveItem = useCallback(
        async (itemId: string) => {
            if (!cart) return

            const prevCart = cart
            const optimisticCart = withItemRemoved(cart, itemId)

            setCart(optimisticCart)
            setItemCount(optimisticCart.itemCount)

            setLoadingItemIds((ids) => new Set([...ids, itemId]))

            try {
                const json = await removeCartItem(
                    sessionIdRef.current,
                    itemId,
                )

                if (json.success) {
                    setCart(json.data)
                    setItemCount(json.data.itemCount)
                } else {
                    setCart(prevCart)
                    setItemCount(prevCart.itemCount)
                }
            } catch {
                setCart(prevCart)
                setItemCount(prevCart.itemCount)
            } finally {
                setLoadingItemIds((ids) => {
                    const next = new Set(ids)

                    next.delete(itemId)

                    return next
                })
            }
        },
        [cart, setItemCount],
    )

    return {
        cart,
        isLoading,
        loadingItemIds,
        handleUpdateQuantity,
        handleRemoveItem,
    }
}