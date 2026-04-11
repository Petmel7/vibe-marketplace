'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartStore {
  /** Persisted guest session identifier. Generated once on first visit. */
  sessionId: string
  /** Whether the cart UI is open (reserved for future drawer usage). */
  isOpen: boolean
  /** Optimistic item count — used for header badge without re-fetching. */
  itemCount: number

  /**
   * Returns the current session ID, generating and persisting a new one
   * if it does not yet exist. Safe to call from effects after mount.
   */
  ensureSessionId: () => string
  setItemCount: (count: number) => void
  openCart: () => void
  closeCart: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      sessionId: '',
      isOpen: false,
      itemCount: 0,

      ensureSessionId: () => {
        const { sessionId } = get()
        if (sessionId) return sessionId
        const id = crypto.randomUUID()
        set({ sessionId: id })
        return id
      },

      setItemCount: (count) => set({ itemCount: count }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: 'vibe-cart',
      // Only persist identity + optimistic count; never server data.
      partialize: (state) => ({
        sessionId: state.sessionId,
        itemCount: state.itemCount,
      }),
    }
  )
)
