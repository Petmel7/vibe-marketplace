'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash, Heart } from 'lucide-react'
import { toast } from 'sonner'
import StateView, { WISHLIST_EMPTY_STATE } from '@/components/ui/StateView'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useWishlistStore } from '@/store/wishlistStore'
import { formatPrice } from '@/lib/formatters/price'
import type { WishlistItemDto } from '@/features/wishlist/wishlist.dto'

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function WishlistSkeleton() {
  return (
    <main className="ui-page-shell pt-4 pb-24">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-36 rounded bg-panel" />
        <div className="h-8 w-52 rounded bg-panel" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3 py-4 border-b border-panelBorder">
            <div className="w-33 h-33 rounded-xl bg-panel shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 rounded bg-panel" />
              <div className="h-4 w-1/3 rounded bg-panel" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function WishlistEmpty() {
  return <StateView {...WISHLIST_EMPTY_STATE} />
}

// ─── Unauthenticated state ────────────────────────────────────────────────────

function WishlistUnauthenticated() {
  return (
    <main className="ui-page-shell flex flex-col items-center justify-center gap-6">
      <Heart size={48} className="text-copy-muted" aria-hidden="true" />
      <p className="ui-body-muted text-xl text-center">
        Увійдіть, щоб переглянути список обраного
      </p>
      <Link href="/" className="ui-primary-button">
        На головну
      </Link>
    </main>
  )
}

// ─── Wishlist item row ────────────────────────────────────────────────────────

interface WishlistItemRowProps {
  item: WishlistItemDto
  isRemoving: boolean
  onRemove: (productId: string) => void
}

function WishlistItemRow({ item, isRemoving, onRemove }: WishlistItemRowProps) {
  return (
    <article className="py-4 border-b border-panelBorder flex gap-3 items-center">
      <Link
        href={`/products/${item.productId}`}
        className="shrink-0 w-33 h-33 rounded-xl overflow-hidden bg-panel flex items-center justify-center"
        tabIndex={-1}
        aria-hidden="true"
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            width={132}
            height={132}
            className="object-contain w-full h-full p-2"
          />
        ) : (
          <span className="ui-meta-text">Немає фото</span>
        )}
      </Link>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <Link
          href={`/products/${item.productId}`}
          className="font-bold text-[14px] leading-5 text-copy-primary truncate hover:underline"
        >
          {item.name}
        </Link>
        <p className="ui-price-card text-brand-accent">
          {formatPrice(item.price)}
        </p>
      </div>

      <button
        type="button"
        aria-label={`Видалити ${item.name} з обраного`}
        onClick={() => onRemove(item.productId)}
        disabled={isRemoving}
        className="shrink-0 flex items-center justify-center w-10 h-10 disabled:opacity-40"
      >
        <Trash width={16} height={18} className="text-copy-muted" aria-hidden="true" />
      </button>
    </article>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type PageState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; items: WishlistItemDto[] }
  | { status: 'error' }

export default function WishlistPage() {
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  const removeFromStore = useWishlistStore((s) => s.remove)
  const addToStore = useWishlistStore((s) => s.add)

  // ── Initial fetch ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data } = await supabaseBrowser.auth.getSession()
      const token = data.session?.access_token

      if (!token) {
        if (!cancelled) setState({ status: 'unauthenticated' })
        return
      }

      try {
        const res = await fetch('/api/wishlist', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()

        if (!cancelled) {
          if (json.success) {
            setState({ status: 'ready', items: json.data.items })
          } else {
            setState({ status: 'error' })
          }
        }
      } catch {
        if (!cancelled) setState({ status: 'error' })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Remove handler ─────────────────────────────────────────────────────────

  const handleRemove = useCallback(
    async (productId: string) => {
      if (state.status !== 'ready') return

      const { data } = await supabaseBrowser.auth.getSession()
      const token = data.session?.access_token
      if (!token) return

      const prevItems = state.items

      // Optimistic update
      setState({ status: 'ready', items: prevItems.filter((i) => i.productId !== productId) })
      removeFromStore(productId)
      setRemovingIds((ids) => new Set([...ids, productId]))

      try {
        const res = await fetch(`/api/wishlist/${productId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()

        if (!json.success) {
          // Rollback
          setState({ status: 'ready', items: prevItems })
          addToStore(productId)
          toast.error('Не вдалося видалити з обраного')
        } else {
          toast.success('Видалено з обраного')
        }
      } catch {
        // Rollback
        setState({ status: 'ready', items: prevItems })
        addToStore(productId)
        toast.error('Помилка мережі')
      } finally {
        setRemovingIds((ids) => {
          const next = new Set(ids)
          next.delete(productId)
          return next
        })
      }
    },
    [state, removeFromStore, addToStore],
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  if (state.status === 'loading') return <WishlistSkeleton />
  if (state.status === 'unauthenticated') return <WishlistUnauthenticated />
  if (state.status === 'error') {
    return (
      <main className="ui-page-shell flex flex-col items-center justify-center gap-4">
        <p className="ui-body-muted text-xl">Не вдалося завантажити обране</p>
        <Link href="/" className="text-brand hover:underline">
          На головну
        </Link>
      </main>
    )
  }
  if (state.items.length === 0) return <WishlistEmpty />

  return (
    <main className="ui-page-shell pt-4 pb-24 md:pb-12">
      <nav aria-label="Хлібні крихти" className="flex items-center gap-1.5 mb-6">
        <Link href="/" className="text-[13px] leading-5 font-medium text-white hover:underline">
          Головна
        </Link>
        <span className="text-[13px] text-copy-muted">/</span>
        <span className="text-[13px] leading-5 font-medium text-copy-muted">Обране</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="ui-heading-page">Обране</h1>
        <span className="ui-body-muted">
          {state.items.length} {state.items.length === 1 ? 'товар' : 'товарів'}
        </span>
      </div>

      {/* Items */}
      <div className="max-w-2xl">
        {state.items.map((item) => (
          <WishlistItemRow
            key={item.id}
            item={item}
            isRemoving={removingIds.has(item.productId)}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </main>
  )
}
