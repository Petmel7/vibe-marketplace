'use client'

import { ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cartApi } from '@/components/cart/api/cart.api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCartStore } from '@/store/cartStore'

interface ProductCardAddToCartButtonProps {
  disabled?: boolean
  disabledLabel?: string
  productName: string
  variantId: string | null
}

export default function ProductCardAddToCartButton({
  disabled = false,
  disabledLabel = 'Немає в наявності',
  productName,
  variantId,
}: ProductCardAddToCartButtonProps) {
  const { isAuthenticated } = useCurrentUser()
  const [isAdding, setIsAdding] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleAddToCart(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (!variantId || isAdding || disabled) return

    const store = useCartStore.getState()
    const sessionId = store.ensureSessionId()
    const previousCount = store.itemCount

    setErrorMessage(null)
    store.setItemCount(previousCount + 1)
    setIsAdding(true)

    try {
      const cart = await cartApi.addItem(
        isAuthenticated
          ? { auth: true }
          : { sessionId },
        variantId,
        1,
      )

      useCartStore.getState().setItemCount(cart.itemCount)
      toast.success('Товар додано в кошик')
    } catch (error) {
      useCartStore.getState().setItemCount(previousCount)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Не вдалося додати товар у кошик. Спробуйте ще раз.',
      )
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!variantId || disabled || isAdding}
        aria-label={disabled ? `${disabledLabel}: ${productName}` : `Додати ${productName} до кошика`}
        className={[
          'inline-flex h-11 w-full items-center justify-center gap-2 rounded-4xl border px-4 text-sm font-medium transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-copy-base',
          !variantId || disabled || isAdding
            ? 'cursor-not-allowed border-panelBorder bg-panelAlt text-copy-muted opacity-70'
            : 'border-brand-accent bg-brand-accent text-copy-base hover:brightness-110',
        ].join(' ')}
      >
        <ShoppingBag size={18} aria-hidden="true" />
        {disabled ? disabledLabel : isAdding ? 'Додаємо...' : 'До кошика'}
      </button>

      {errorMessage ? (
        <p className="text-xs text-brand-danger" aria-live="polite">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
