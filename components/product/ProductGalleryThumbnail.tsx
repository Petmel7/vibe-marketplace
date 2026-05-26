'use client'

import Image from 'next/image'

interface ProductGalleryThumbnailProps {
  alt: string
  isSelected: boolean
  onSelect: () => void
  onError?: () => void
  src: string
}

export default function ProductGalleryThumbnail({
  alt,
  isSelected,
  onSelect,
  onError,
  src,
}: ProductGalleryThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={alt}
      aria-pressed={isSelected}
      className={[
        'group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-white transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-copy-base',
        isSelected
          ? 'border-brand-accent shadow-[0_0_0_1px_rgba(68,199,255,0.35)]'
          : 'border-panelBorder hover:border-brand-accent/50',
      ].join(' ')}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="80px"
        className="object-contain p-2 transition duration-200 group-hover:scale-[1.02]"
        onError={onError}
      />
    </button>
  )
}
