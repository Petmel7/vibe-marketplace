'use client'

import ImagePreview from './ImagePreview'

export default function UploadThumbnail({
  src,
  alt,
  size = 'md',
}: {
  src?: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClassName = {
    sm: 'h-12 w-12 rounded-xl',
    md: 'h-16 w-16 rounded-2xl',
    lg: 'h-24 w-24 rounded-2xl',
  }[size]

  return (
    <ImagePreview
      src={src}
      alt={alt}
      className={sizeClassName}
      sizes="96px"
      emptyLabel=""
    />
  )
}
