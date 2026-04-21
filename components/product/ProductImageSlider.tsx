'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

interface Props {
  images: string[]
  alt: string
}

export default function ProductImageSlider({ images, alt }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const hasImages = images.length > 0

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || images.length <= 1) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 40) {
      setCurrentIndex((prev) =>
        delta > 0 ? Math.min(prev + 1, images.length - 1) : Math.max(prev - 1, 0)
      )
    }
    touchStartX.current = null
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="ui-gallery-stage" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {hasImages ? (
          <Image
            src={images[currentIndex]}
            alt={alt}
            fill
            className="object-contain p-8"
            sizes="(min-width: 768px) 432px, 100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-copy-muted">
            Немає зображення
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex justify-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 w-2 rounded-full transition-colors ${i === currentIndex ? 'bg-brand' : 'bg-panelAlt'
                }`}
              aria-label={`Зображення ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
