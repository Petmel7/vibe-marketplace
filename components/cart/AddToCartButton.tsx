'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cartStore'

interface Props {
  productId: string
  variantId: string | null
  quantity: number
}

export default function AddToCartButton({ variantId, quantity }: Props) {
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
    <button onClick={handleAddToCart} disabled={!variantId || isAdding} className="ui-primary-button w-full">
      {isAdding ? 'Додаємо...' : 'До кошика'}
    </button>
  )
}
