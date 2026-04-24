'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import CartItem from './CartItem'
import StateView, { CART_EMPTY_STATE } from '@/components/ui/StateView'
import { useCartStore } from '@/store/cartStore'
import type { CartDto } from '@/features/cart/cart.dto'
import { formatPrice } from '@/lib/formatters/price'

function pluralizeItems(count: number): string {
  if (count === 1) return 'Товари'
  if (count >= 2 && count <= 4) return 'Товар'
  return 'Товарів'
}

function withQuantityUpdate(cart: CartDto, itemId: string, newQty: number): CartDto {
  const items = cart.items.map((item) => {
    if (item.id !== itemId) return item
    const newLineTotal = (Number(item.unitPrice) * newQty).toFixed(2)
    return { ...item, quantity: newQty, lineTotal: newLineTotal }
  })
  const totalAmount = items.reduce((acc, i) => acc + Number(i.lineTotal), 0).toFixed(2)
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0)
  return { ...cart, items, totalAmount, itemCount }
}

function withItemRemoved(cart: CartDto, itemId: string): CartDto {
  const items = cart.items.filter((i) => i.id !== itemId)
  const totalAmount = items.reduce((acc, i) => acc + Number(i.lineTotal), 0).toFixed(2)
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0)
  return { ...cart, items, totalAmount, itemCount }
}

function CartSkeleton() {
  return (
    <main className="ui-page-shell pt-4 pb-24">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-36 rounded bg-panel" />
        <div className="h-8 w-52 rounded bg-panel" />
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3 border-b border-panelBorder py-4">
            <div className="h-33 w-33 rounded-xl bg-panel" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 rounded bg-panel" />
              <div className="h-4 w-1/2 rounded bg-panel" />
              <div className="h-8 w-29 rounded-2xl bg-panel" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

function CartEmpty() {
  return <StateView {...CART_EMPTY_STATE} />
}

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border-2 border-brand transition-colors"
      style={{ background: checked ? '#9466FF' : 'transparent' }}
    >
      {checked && (
        <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden="true">
          <path
            d="M1 4L4.5 7.5L11 1"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}

export default function CartDrawer() {
  const setItemCount = useCartStore((s) => s.setItemCount)

  const [cart, setCart] = useState<CartDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingItemIds, setLoadingItemIds] = useState<Set<string>>(new Set())
  const [promoCode, setPromoCode] = useState('')
  const [agreed, setAgreed] = useState(false)
  const sessionIdRef = useRef('')

  useEffect(() => {
    sessionIdRef.current = useCartStore.getState().ensureSessionId()

    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/cart', {
          headers: { 'x-session-id': sessionIdRef.current },
        })
        const json = await res.json()
        if (!cancelled && json.success) {
          setCart(json.data)
          setItemCount(json.data.itemCount)
        }
      } catch {
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [setItemCount])

  const handleUpdateQuantity = useCallback(
    async (itemId: string, newQuantity: number) => {
      if (!cart) return

      const prev = cart
      const optimistic = withQuantityUpdate(cart, itemId, newQuantity)
      setCart(optimistic)
      setItemCount(optimistic.itemCount)
      setLoadingItemIds((ids) => new Set([...ids, itemId]))

      try {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionIdRef.current,
          },
          body: JSON.stringify({ quantity: newQuantity }),
        })
        const json = await res.json()
        if (json.success) {
          setCart(json.data)
          setItemCount(json.data.itemCount)
        } else {
          setCart(prev)
          setItemCount(prev.itemCount)
        }
      } catch {
        setCart(prev)
        setItemCount(prev.itemCount)
      } finally {
        setLoadingItemIds((ids) => {
          const next = new Set(ids)
          next.delete(itemId)
          return next
        })
      }
    },
    [cart, setItemCount]
  )

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      if (!cart) return

      const prev = cart
      const optimistic = withItemRemoved(cart, itemId)
      setCart(optimistic)
      setItemCount(optimistic.itemCount)
      setLoadingItemIds((ids) => new Set([...ids, itemId]))

      try {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: 'DELETE',
          headers: { 'x-session-id': sessionIdRef.current },
        })
        const json = await res.json()
        if (json.success) {
          setCart(json.data)
          setItemCount(json.data.itemCount)
        } else {
          setCart(prev)
          setItemCount(prev.itemCount)
        }
      } catch {
        setCart(prev)
        setItemCount(prev.itemCount)
      } finally {
        setLoadingItemIds((ids) => {
          const next = new Set(ids)
          next.delete(itemId)
          return next
        })
      }
    },
    [cart, setItemCount]
  )

  if (isLoading) return <CartSkeleton />
  if (!cart || cart.items.length === 0) return <CartEmpty />

  return (
    <main className="pt-4 pb-24 md:pb-12">
      <nav aria-label="Хлібні крихти" className="mb-6 flex items-center gap-1.5">
        <Link href="/" className="text-[13px] font-medium leading-5 text-white hover:underline">
          Головна
        </Link>
        <span className="text-[13px] text-copy-muted">/</span>
        <span className="text-[13px] font-medium leading-5 text-copy-muted">Кошик</span>
      </nav>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="ui-heading-page">Кошик</h1>
        <span className="text-[13px] leading-5 text-copy-muted">
          {cart.itemCount} {pluralizeItems(cart.itemCount)}
        </span>
      </div>
      {/* CartItem */}
      <div className="md:flex md:items-start md:gap-8">
        <div className="min-w-0 flex-1">
          <div>
            {cart.items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveItem}
                isLoading={loadingItemIds.has(item.id)}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-col md:flex-row md:items-center md:gap-6">

            <div className="rounded-full border border-panelBorder bg-panel overflow-hidden">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Промокод"
                className="ui-surface-input-plain h-12 w-74"
                aria-label="Промокод"
              />
            </div>
            <p className="ui-body-secondary mt-2 md:hidden">
              Щоб скористатися знижкою введіть промокод
            </p>
          </div>
          <p className="ui-body-secondary hidden md:block">
            Щоб скористатися знижкою введіть промокод
          </p>
        </div>

        <div className="mt-6 md:mt-0 md:w-80 md:shrink-0">
          <div className="md:sticky md:top-24">
            <div className="ui-summary-card">
              <div className="flex items-center justify-between">
                <span className="ui-body-muted">{cart.itemCount} товар на суму</span>
                <span className="text-[13px] leading-5 tabular-nums text-copy-secondary">
                  {formatPrice(cart.totalAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-panelBorder pb-4">
                <span className="ui-body-muted">Сума зі знижкою</span>
                <span className="text-[13px] leading-5 tabular-nums text-copy-secondary">
                  {formatPrice(cart.totalAmount)}
                </span>
              </div>

              <div className="pt-1">
                <p className="text-[16px] font-bold leading-5 text-copy-primary">Підсумок</p>
                <p className="mt-1 text-[20px] font-medium leading-7 tabular-nums text-brand-accent">
                  {formatPrice(cart.totalAmount)}
                </p>
              </div>

              <button type="button" className="ui-primary-button mt-2 w-full">
                Оформити замовлення
              </button>

              <div className="flex items-start gap-2 pt-1">
                <Checkbox checked={agreed} onChange={setAgreed} />
                <p className="text-[10px] leading-3 text-copy-secondary">
                  Натискаючи на кнопку «Оформити замовлення», ви погоджуєтеся на обробку{' '}
                  <a href="#" className="text-brand hover:underline">
                    персональних даних
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
