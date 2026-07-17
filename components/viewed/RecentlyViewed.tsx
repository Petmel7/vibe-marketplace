'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import ProductCard from '../product/ProductCard'
import { useViewedProducts } from './hooks/useViewedProducts'

interface Props {
  currentProductId?: string
  showHeading?: boolean
  emptyState?: ReactNode
}

const SCROLL_EDGE_EPSILON = 4
const MIN_SCROLL_STEP = 240

export default function RecentlyViewed({
  currentProductId,
  showHeading = true,
  emptyState = null,
}: Props) {
  const { items, isLoading } = useViewedProducts(currentProductId)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [canScroll, setCanScroll] = useState(false)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const updateScrollState = useCallback(() => {
    const track = trackRef.current
    if (!track) {
      return
    }

    const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth)
    setCanScroll(maxScrollLeft > SCROLL_EDGE_EPSILON)
    setCanScrollPrev(track.scrollLeft > SCROLL_EDGE_EPSILON)
    setCanScrollNext(track.scrollLeft < maxScrollLeft - SCROLL_EDGE_EPSILON)
  }, [])

  useEffect(() => {
    updateScrollState()

    const track = trackRef.current
    if (!track) {
      return
    }

    const handleScroll = () => {
      updateScrollState()
    }

    track.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', updateScrollState)

    return () => {
      track.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [items.length, updateScrollState])

  const scrollByAmount = (direction: -1 | 1) => {
    const track = trackRef.current
    if (!track) {
      return
    }

    const amount = Math.max(track.clientWidth - 64, MIN_SCROLL_STEP)
    track.scrollBy({ left: direction * amount, behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <section>
        {showHeading ? <h2 className="ui-heading-section">Недавно переглянуті товари</h2> : null}
        <div className="ui-scroll-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-95 w-51.75 shrink-0 rounded-2xl bg-panel animate-pulse" />
          ))}
        </div>
      </section>
    )
  }

  if (items.length === 0) {
    return emptyState ? <section>{emptyState}</section> : null
  }

  return (
    <section>
      {showHeading || canScroll ? (
        <div className={`flex items-center gap-3 ${showHeading ? 'mb-5 justify-between' : 'mb-4 justify-end'}`}>
          {showHeading ? <h2 className="ui-heading-section mb-0">Недавно переглянуті товари</h2> : <div />}
          {canScroll ? (
            <div className="hidden items-center gap-2 lg:flex">
              <button
                type="button"
                aria-label="Попередні товари"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-panelBorder bg-panelAlt text-copy-strong transition hover:border-brand-accent/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel disabled:cursor-not-allowed disabled:text-copy-muted disabled:opacity-45"
                onClick={() => scrollByAmount(-1)}
                disabled={!canScrollPrev}
              >
                <ChevronLeft size={18} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                aria-label="Наступні товари"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-panelBorder bg-panelAlt text-copy-strong transition hover:border-brand-accent/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel disabled:cursor-not-allowed disabled:text-copy-muted disabled:opacity-45"
                onClick={() => scrollByAmount(1)}
                disabled={!canScrollNext}
              >
                <ChevronRight size={18} strokeWidth={2.25} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div ref={trackRef} className="ui-scroll-row-snap">
        {items.map((item) => (
          <div key={item.id} className="w-51.75 shrink-0 snap-start">
            <ProductCard
              id={item.productId}
              name={item.name}
              imageUrl={item.imageUrl ?? ''}
              product={{ price: item.price, sku: null, variants: [] }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
