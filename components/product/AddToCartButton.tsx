'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cartStore'

interface Props {
  productId: string
  variantId: string | null
  quantity: number
}

export default function AddToCartButton({ productId: _productId, variantId, quantity }: Props) {
  const [isAdding, setIsAdding] = useState(false)

  async function handleAddToCart() {
    if (!variantId || isAdding) return

    const store = useCartStore.getState()
    const sessionId = store.ensureSessionId()
    const prevCount = store.itemCount

    store.setItemCount(prevCount + quantity)
    setIsAdding(true)

    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({ variantId, quantity }),
      })
      const json = await res.json()
      if (json.success) {
        useCartStore.getState().setItemCount(json.data.itemCount)
      } else {
        useCartStore.getState().setItemCount(prevCount)
      }
    } catch {
      useCartStore.getState().setItemCount(prevCount)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={!variantId || isAdding}
      className="w-full h-12 rounded-[50px] px-8.75 py-3 bg-[#9466FF] font-medium text-[16px] leading-6 text-[#F1F3F5] transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60"
    >
      {isAdding ? 'Додаємо...' : 'В кошик'}
    </button>
  )
}
