'use client'

import { Star } from 'lucide-react'

export default function ReviewStars({
  rating,
  interactive = false,
  size = 18,
  onChange,
  label,
}: {
  rating: number
  interactive?: boolean
  size?: number
  onChange?: (rating: number) => void
  label?: string
}) {
  return (
    <div
      className="flex items-center gap-1"
      aria-label={label ?? `Рейтинг ${rating} з 5`}
      role={interactive ? 'radiogroup' : undefined}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1
        const filled = starValue <= rating

        if (!interactive) {
          return (
            <Star
              key={starValue}
              size={size}
              aria-hidden="true"
              className={filled ? 'fill-amber-300 text-amber-300' : 'text-panelBorder'}
            />
          )
        }

        return (
          <button
            key={starValue}
            type="button"
            role="radio"
            aria-checked={starValue === rating}
            aria-label={`${starValue} зір${starValue === 1 ? 'ка' : starValue < 5 ? 'ки' : 'ок'}`}
            onClick={() => onChange?.(starValue)}
            className="rounded-full p-1 transition hover:bg-panelAlt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
          >
            <Star
              size={size}
              aria-hidden="true"
              className={filled ? 'fill-amber-300 text-amber-300' : 'text-panelBorder'}
            />
          </button>
        )
      })}
    </div>
  )
}
