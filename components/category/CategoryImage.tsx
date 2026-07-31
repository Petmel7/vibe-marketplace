'use client'

import Image from 'next/image'
import { useState } from 'react'
import { getImageUrl } from '@/utils/getImageUrl'

const CATEGORY_IMAGE_FALLBACK = '/placeholder.png'

export default function CategoryImage({
  src,
  alt,
  sizes,
  className,
  imageClassName = 'object-cover',
}: {
  src?: string | null
  alt: string
  sizes: string
  className: string
  imageClassName?: string
}) {
  const normalizedSrc = getImageUrl(src, CATEGORY_IMAGE_FALLBACK)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const imageSrc = failedSrc === normalizedSrc ? CATEGORY_IMAGE_FALLBACK : normalizedSrc

  return (
    <span className={className}>
      <Image
        src={imageSrc}
        alt={alt}
        fill
        sizes={sizes}
        className={imageClassName}
        onError={() => {
          if (imageSrc !== CATEGORY_IMAGE_FALLBACK) {
            setFailedSrc(imageSrc)
          }
        }}
      />
    </span>
  )
}
