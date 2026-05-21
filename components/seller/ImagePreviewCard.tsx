'use client'

import Image from 'next/image'
import { useState, type ReactNode } from 'react'

function PreviewMedia({
  src,
  alt,
}: {
  src: string
  alt: string
}) {
  const [hasError, setHasError] = useState(false)
  const isObjectUrl = src.startsWith('blob:') || src.startsWith('data:')

  if (hasError) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-copy-muted">
        Unable to load this image preview
      </div>
    )
  }

  if (isObjectUrl) {
    // Local object URLs are safer rendered directly than routed through Next image optimization.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => setHasError(true)}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      className="object-cover"
      sizes="(max-width: 768px) 100vw, 320px"
      onError={() => setHasError(true)}
    />
  )
}

export default function ImagePreviewCard({
  title,
  alt,
  src,
  isPrimary = false,
  statusLabel,
  helperText,
  children,
}: {
  title: string
  alt: string
  src?: string | null
  isPrimary?: boolean
  statusLabel?: string
  helperText?: string
  children?: ReactNode
}) {
  return (
    <article className="rounded-3xl border border-panelBorder bg-panel p-4">
      <div className="relative h-40 overflow-hidden rounded-2xl border border-dashed border-panelBorder bg-panelAlt">
        {src ? (
          <PreviewMedia key={src} src={src} alt={alt} />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-copy-muted">
            No image selected
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-copy-strong">{title}</p>
          {helperText ? <p className="mt-1 text-sm text-copy-muted">{helperText}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPrimary ? (
            <span className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-white">
              Primary
            </span>
          ) : null}
          {statusLabel ? (
            <span className="rounded-full border border-panelBorder px-3 py-1 text-xs text-copy-secondary">
              {statusLabel}
            </span>
          ) : null}
        </div>
      </div>

      {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
    </article>
  )
}
