'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cartStore'

interface Props {
  variantId: string | null
  quantity: number
  disabled?: boolean
  disabledLabel?: string
}

export default function AddToCartButton({
  variantId,
  quantity,
  disabled = false,
  disabledLabel = 'Немає в наявності',
}: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleAddToCart() {
    if (!variantId || isAdding || disabled) return

    const store = useCartStore.getState()
    const sessionId = store.ensureSessionId()
    const prevCount = store.itemCount

    setErrorMessage(null)
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
        return
      }

      useCartStore.getState().setItemCount(prevCount)
      setErrorMessage(
        json.error?.message || 'Не вдалося додати товар у кошик. Спробуйте ще раз.',
      )
    } catch {
      useCartStore.getState().setItemCount(prevCount)
      setErrorMessage('Не вдалося додати товар у кошик. Спробуйте ще раз.')
    } finally {
      setIsAdding(false)
    }
  }

  const buttonLabel = disabled
    ? disabledLabel
    : isAdding
      ? 'Додаємо...'
      : 'До кошика'

  return (
    <div className="space-y-3">
      <button
        onClick={handleAddToCart}
        disabled={!variantId || isAdding || disabled}
        className="ui-primary-button w-full disabled:cursor-not-allowed disabled:opacity-60"
        aria-disabled={!variantId || isAdding || disabled}
      >
        {buttonLabel}
      </button>

      {errorMessage ? (
        <p
          className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary"
          aria-live="polite"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
