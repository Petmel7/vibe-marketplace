'use client'

import Image from 'next/image'
import { useState } from 'react'
import clsx from 'clsx'
import UploadEmptyState from './UploadEmptyState'

function isLocalPreviewUrl(src: string) {
  return src.startsWith('blob:') || src.startsWith('data:')
}

export default function ImagePreview({
  src,
  alt,
  emptyLabel = 'Зображення ще не завантажено',
  sizes = '(max-width: 768px) 100vw, 480px',
  className,
  imageClassName,
}: {
  src?: string | null
  alt: string
  emptyLabel?: string
  sizes?: string
  className?: string
  imageClassName?: string
}) {
  const [hasError, setHasError] = useState(false)

  return (
    <div className={clsx('relative flex h-40 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-panelBorder bg-panelAlt', className)}>
      {src && !hasError ? (
        isLocalPreviewUrl(src) ? (
          // Local previews should not go through Next image optimization.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className={clsx('h-full w-full object-cover', imageClassName)}
            onError={() => setHasError(true)}
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            sizes={sizes}
            className={clsx('object-cover', imageClassName)}
            onError={() => setHasError(true)}
          />
        )
      ) : (
        <UploadEmptyState>{hasError ? 'Не вдалося показати прев’ю зображення' : emptyLabel}</UploadEmptyState>
      )}
    </div>
  )
}
