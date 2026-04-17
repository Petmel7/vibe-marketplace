import { create } from 'zustand'

interface WishlistState {
  /** Set of product IDs the user has wishlisted. */
  productIds: Set<string>
  /** True while the initial wishlist fetch is in-flight. */
  isLoading: boolean

  setProductIds: (ids: string[]) => void
  add: (productId: string) => void
  remove: (productId: string) => void
  has: (productId: string) => boolean
  setLoading: (loading: boolean) => void
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  productIds: new Set(),
  isLoading: false,

  setProductIds: (ids) => set({ productIds: new Set(ids) }),

  add: (productId) =>
    set((state) => ({ productIds: new Set([...state.productIds, productId]) })),

  remove: (productId) =>
    set((state) => {
      const next = new Set(state.productIds)
      next.delete(productId)
      return { productIds: next }
    }),

  has: (productId) => get().productIds.has(productId),

  setLoading: (loading) => set({ isLoading: loading }),
}))
