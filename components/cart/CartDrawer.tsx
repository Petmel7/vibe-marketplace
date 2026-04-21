'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import CartItem from './CartItem'
import { useCartStore } from '@/store/cartStore'
import type { CartDto } from '@/features/cart/cart.dto'
import { formatPrice } from '@/lib/formatters/price'

// ─── Helpers ────────────────────────────────────────────────────────────────

function pluralizeItems(count: number): string {
  if (count === 1) return 'Товар'
  if (count >= 2 && count <= 4) return 'Товари'
  return 'Товарів'
}

/** Optimistically apply a quantity change without waiting for the API. */
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

/** Optimistically remove an item without waiting for the API. */
function withItemRemoved(cart: CartDto, itemId: string): CartDto {
  const items = cart.items.filter((i) => i.id !== itemId)
  const totalAmount = items.reduce((acc, i) => acc + Number(i.lineTotal), 0).toFixed(2)
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0)
  return { ...cart, items, totalAmount, itemCount }
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function CartSkeleton() {
  return (
    <main className="min-h-screen bg-[#1D2533] px-4 md:px-8 lg:px-16 pt-4 pb-24">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-36 rounded bg-[#2A323F]" />
        <div className="h-8 w-52 rounded bg-[#2A323F]" />
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3 py-4 border-b border-white/10">
            <div className="w-33 h-33 rounded-xl bg-[#2A323F]" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 rounded bg-[#2A323F]" />
              <div className="h-4 w-1/2 rounded bg-[#2A323F]" />
              <div className="h-8 w-29 rounded-2xl bg-[#2A323F]" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function CartEmpty() {
  return (
    <main className="min-h-screen bg-[#1D2533] px-4 flex flex-col items-center justify-center gap-6">
      <p className="text-[#A5A8AD] text-xl">Кошик порожній</p>
      <Link
        href="/"
        className="h-12 rounded-[50px] bg-[#9466FF] text-[#F1F3F5] font-medium text-[16px] leading-6 px-9 flex items-center"
      >
        Перейти до каталогу
      </Link>
    </main>
  )
}

// ─── Checkbox ────────────────────────────────────────────────────────────────

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
      className="shrink-0 w-6 h-6 rounded-[5px] border-2 border-[#9466FF] flex items-center justify-center transition-colors"
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

// ─── Main component ──────────────────────────────────────────────────────────

export default function CartDrawer() {
  const setItemCount = useCartStore((s) => s.setItemCount)

  const [cart, setCart] = useState<CartDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingItemIds, setLoadingItemIds] = useState<Set<string>>(new Set())
  const [promoCode, setPromoCode] = useState('')
  const [agreed, setAgreed] = useState(false)

  // Stable ref for the session ID — avoids stale closures in callbacks.
  const sessionIdRef = useRef('')

  // ── Initial fetch ──────────────────────────────────────────────────────────

  useEffect(() => {
    // getState() bypasses React subscription; safe to call imperatively.
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
        // Cart remains null → empty state shown
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [setItemCount])

  // ── Quantity update ────────────────────────────────────────────────────────

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

  // ── Remove item ────────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) return <CartSkeleton />
  if (!cart || cart.items.length === 0) return <CartEmpty />

  return (
    <main className="min-h-screen bg-[#1D2533] px-4 md:px-8 lg:px-16 pt-4 pb-24 md:pb-12">
      {/* Breadcrumb */}
      <nav aria-label="Хлібні крихти" className="flex items-center gap-1.5 mb-6">
        <Link
          href="/"
          className="text-[13px] leading-5 font-medium text-white hover:underline"
        >
          Головна
        </Link>
        <span className="text-[#A5A8AD] text-[13px]">•</span>
        <span className="text-[13px] leading-5 font-medium text-[#A5A8AD]">Кошик</span>
      </nav>

      {/* Page title */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-bold text-[24px] leading-8 text-white">Кошик</h1>
        <span className="font-normal text-[13px] leading-5 text-[#A5A8AD]">
          {cart.itemCount} {pluralizeItems(cart.itemCount)}
        </span>
      </div>

      {/* Two-column layout on desktop */}
      <div className="md:flex md:items-start md:gap-8">
        {/* ── Left column: items + promo ── */}
        <div className="flex-1 min-w-0">
          {/* Cart items */}
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

          {/* Promo code */}
          <div className="flex flex-col md:flex-row md:items-center md:gap-6 mt-6">
            <div className="rounded-xl border border-white/10 bg-[#2A323F] overflow-hidden md:w-60 md:shrink-0">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Промокод"
                className="w-full h-12 bg-transparent px-4 text-[14px] leading-5 text-[#D9D9D9] font-normal placeholder:text-[#A5A8AD] outline-none"
                aria-label="Промокод"
              />
              {/* Description visible inside the box on mobile only */}
              <p className="px-4 pb-3 text-[14px] leading-5 text-[#D9D9D9] font-normal md:hidden">
                Щоб скористатися скидкою введіть промокод
              </p>
            </div>
            {/* Description to the right on desktop */}
            <p className="hidden md:block text-[14px] leading-5 text-[#D9D9D9] font-normal">
              Щоб скористатися скидкою введіть промокод
            </p>
          </div>
        </div>

        {/* ── Right column: order summary ── */}
        <div className="mt-6 md:mt-0 md:w-108 md:shrink-0 md:sticky md:top-24">
          <div className="bg-[#2A323F] rounded-2xl p-6 space-y-3">
            {/* Summary lines */}
            <div className="flex items-center justify-between">
              <span className="font-normal text-[14px] leading-5 text-[#A5A8AD]">
                {cart.itemCount} товар на суму
              </span>
              <span className="font-normal text-[13px] leading-5 text-[#D9D9D9] tabular-nums">
                {formatPrice(cart.totalAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="font-normal text-[14px] leading-5 text-[#A5A8AD]">
                Сума зі знижкою
              </span>
              <span className="font-normal text-[13px] leading-5 text-[#D9D9D9] tabular-nums">
                {formatPrice(cart.totalAmount)}
              </span>
            </div>

            {/* Total */}
            <div className="pt-1">
              <p className="font-bold text-[16px] leading-5 text-[#E8E9EA]">Підсумок</p>
              <p className="font-medium text-[20px] leading-7 text-[#16D9A6] mt-1 tabular-nums">
                {formatPrice(cart.totalAmount)}
              </p>
            </div>

            {/* Checkout button */}
            <button
              type="button"
              className="w-full h-12 rounded-[50px] bg-[#9466FF] font-medium text-[16px] leading-6 text-[#F1F3F5] py-3 px-8.75 mt-2"
            >
              Оформити замовлення
            </button>

            {/* Terms */}
            <div className="flex items-start gap-2 pt-1">
              <Checkbox checked={agreed} onChange={setAgreed} />
              <p className="font-normal text-[10px] leading-3 text-[#D9D9D9]">
                Натискаючи на кнопку «Оформити замовлення», ви погоджуєтеся на обробку{' '}
                <a href="#" className="text-[#9466FF] hover:underline">
                  персональних даних
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
