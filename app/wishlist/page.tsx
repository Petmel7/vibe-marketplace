'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useWishlistStore } from '@/store/wishlistStore'
import type { WishlistItemDto } from '@/features/wishlist/wishlist.dto'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(price: string) {
  return Number(price).toLocaleString('uk-UA')
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function WishlistSkeleton() {
  return (
    <main className="min-h-screen bg-[#1D2533] px-4 md:px-8 lg:px-16 pt-4 pb-24">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-36 rounded bg-[#2A323F]" />
        <div className="h-8 w-52 rounded bg-[#2A323F]" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3 py-4 border-b border-white/10">
            <div className="w-33 h-33 rounded-xl bg-[#2A323F] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 rounded bg-[#2A323F]" />
              <div className="h-4 w-1/3 rounded bg-[#2A323F]" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function WishlistEmpty() {
  return (
    <main className="min-h-screen bg-[#1D2533] px-4 flex flex-col items-center justify-center gap-6">
      <Heart size={48} color="#A5A8AD" aria-hidden="true" />
      <p className="text-[#A5A8AD] text-xl">Список обраного порожній</p>
      <Link
        href="/"
        className="h-12 rounded-[50px] bg-[#9466FF] text-[#F1F3F5] font-medium text-[16px] leading-6 px-9 flex items-center"
      >
        Перейти до каталогу
      </Link>
    </main>
  )
}

// ─── Unauthenticated state ────────────────────────────────────────────────────

function WishlistUnauthenticated() {
  return (
    <main className="min-h-screen bg-[#1D2533] px-4 flex flex-col items-center justify-center gap-6">
      <Heart size={48} color="#A5A8AD" aria-hidden="true" />
      <p className="text-[#A5A8AD] text-xl text-center">
        Увійдіть, щоб переглянути список обраного
      </p>
      <Link
        href="/"
        className="h-12 rounded-[50px] bg-[#9466FF] text-[#F1F3F5] font-medium text-[16px] leading-6 px-9 flex items-center"
      >
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
    <article className="py-4 border-b border-white/10 flex gap-3 items-center">
      {/* Image */}
      <Link
        href={`/products/${item.productId}`}
        className="shrink-0 w-33 h-33 rounded-xl overflow-hidden bg-[#2A323F] flex items-center justify-center"
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
          <span className="text-[#A5A8AD] text-xs">Немає фото</span>
        )}
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <Link
          href={`/products/${item.productId}`}
          className="font-bold text-[14px] leading-5 text-[#E8E9EA] truncate hover:underline"
        >
          {item.name}
        </Link>
        <p className="font-medium text-[20px] leading-7 text-[#16D9A6]">
          {fmt(item.price)} ₴
        </p>
      </div>

      {/* Remove */}
      <button
        type="button"
        aria-label={`Видалити ${item.name} з обраного`}
        onClick={() => onRemove(item.productId)}
        disabled={isRemoving}
        className="shrink-0 flex items-center justify-center w-10 h-10 disabled:opacity-40"
      >
        <Trash width={16} height={18} color="#A5A8AD" aria-hidden="true" />
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
      <main className="min-h-screen bg-[#1D2533] px-4 flex flex-col items-center justify-center gap-4">
        <p className="text-[#A5A8AD] text-xl">Не вдалося завантажити обране</p>
        <Link href="/" className="text-[#9466FF] hover:underline">
          На головну
        </Link>
      </main>
    )
  }
  if (state.items.length === 0) return <WishlistEmpty />

  return (
    <main className="min-h-screen bg-[#1D2533] px-4 md:px-8 lg:px-16 pt-4 pb-24 md:pb-12">
      {/* Breadcrumb */}
      <nav aria-label="Хлібні крихти" className="flex items-center gap-1.5 mb-6">
        <Link href="/" className="text-[13px] leading-5 font-medium text-white hover:underline">
          Головна
        </Link>
        <span className="text-[#A5A8AD] text-[13px]">•</span>
        <span className="text-[13px] leading-5 font-medium text-[#A5A8AD]">Обране</span>
      </nav>

      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-bold text-[24px] leading-8 text-white">Обране</h1>
        <span className="font-normal text-[13px] leading-5 text-[#A5A8AD]">
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
