import type { ReactNode } from 'react'
import clsx from 'clsx'
import FilePreview from './FilePreview'
import ImagePreview from './ImagePreview'

type UploadPreviewKind = 'image' | 'file'

export default function UploadPreview({
  kind = 'image',
  src,
  alt,
  title,
  helperText,
  statusLabel,
  action,
  className,
  previewClassName,
  emptyLabel,
  sizes,
}: {
  kind?: UploadPreviewKind
  src?: string | null
  alt: string
  title?: ReactNode
  helperText?: ReactNode
  statusLabel?: ReactNode
  action?: ReactNode
  className?: string
  previewClassName?: string
  emptyLabel?: string
  sizes?: string
}) {
  if (kind === 'file') {
    return (
      <FilePreview
        className={className}
        fileName={title ?? alt}
        metadata={helperText}
        action={action}
      />
    )
  }

  return (
    <div className={clsx('space-y-3', className)}>
      <ImagePreview
        src={src}
        alt={alt}
        emptyLabel={emptyLabel}
        sizes={sizes}
        className={previewClassName}
      />

      {title || helperText || statusLabel ? (
        <div className="space-y-1">
          {title ? <p className="text-sm font-medium text-copy-strong">{title}</p> : null}
          {helperText ? <p className="break-all text-sm text-copy-muted">{helperText}</p> : null}
          {statusLabel ? <p className="text-xs font-medium uppercase tracking-[0.18em] text-copy-muted">{statusLabel}</p> : null}
        </div>
      ) : null}

      {action}
    </div>
  )
}
