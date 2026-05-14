'use client'

import {
    useCallback,
    useEffect,
    useState,
} from 'react'
import { toast } from 'sonner'
import { wishlistApi } from '../api/wishlist.api'
import { useWishlistStore } from '@/store/wishlistStore'
import type { WishlistItemDto } from '@/features/wishlist/wishlist.dto'

type WishlistPageState =
    | {
        status: 'loading'
    }
    | {
        status: 'error'
    }
    | {
        status: 'ready'
        items: WishlistItemDto[]
    }

export function useWishlistPage() {
    const [state, setState] =
        useState<WishlistPageState>({
            status: 'loading',
        })

    const [removingIds, setRemovingIds] =
        useState<Set<string>>(new Set())

    const removeFromStore = useWishlistStore(
        (s) => s.remove,
    )

    const addToStore = useWishlistStore(
        (s) => s.add,
    )

    useEffect(() => {
        let cancelled = false

        async function loadWishlist() {
            try {
                const data = await wishlistApi.getAll() as { items: WishlistItemDto[] }

                if (cancelled) return

                setState({
                    status: 'ready',
                    items: data.items,
                })
            } catch {
                if (!cancelled) {
                    setState({
                        status: 'error',
                    })
                }
            }
        }

        loadWishlist()

        return () => {
            cancelled = true
        }
    }, [])

    const handleRemove = useCallback(
        async (productId: string) => {
            if (state.status !== 'ready') {
                return
            }

            const previousItems = state.items

            const nextItems = previousItems.filter(
                (item) =>
                    item.productId !== productId,
            )

            // optimistic update
            setState({
                status: 'ready',
                items: nextItems,
            })

            removeFromStore(productId)

            setRemovingIds((ids) => {
                return new Set([
                    ...ids,
                    productId,
                ])
            })

            try {
                await wishlistApi.remove(
                    productId,
                )

                toast.success(
                    'Видалено з обраного',
                )
            } catch {
                // rollback
                setState({
                    status: 'ready',
                    items: previousItems,
                })

                addToStore(productId)

                toast.error(
                    'Не вдалося видалити з обраного',
                )
            } finally {
                setRemovingIds((ids) => {
                    const next = new Set(ids)

                    next.delete(productId)

                    return next
                })
            }
        },
        [
            state,
            removeFromStore,
            addToStore,
        ],
    )

    return {
        state,
        removingIds,
        handleRemove,
    }
}