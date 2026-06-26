'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import EvidenceFileTypeIcon from './EvidenceFileTypeIcon'
import { formatEvidenceSize, isImageEvidenceType, isPdfEvidenceType } from './evidence.shared'

type EvidenceCardAction =
  | {
      label: string
      onClick: () => void
      tone?: 'secondary' | 'danger'
    }
  | undefined

export default function EvidenceFileCard({
  fileName,
  fileType,
  fileSize,
  previewUrl,
  fileUrl,
  createdAt,
  statusLabel,
  action,
  onPreviewError,
}: {
  fileName: string
  fileType: string
  fileSize: number
  previewUrl?: string | null
  fileUrl?: string | null
  createdAt?: string | null
  statusLabel?: string | null
  action?: EvidenceCardAction
  onPreviewError?: () => void
}) {
  const isImage = isImageEvidenceType(fileType)
  const isPdf = isPdfEvidenceType(fileType)
  const [hasPreviewError, setHasPreviewError] = useState(false)
  const actionClassName = action?.tone === 'danger'
    ? 'rounded-full border border-brand-danger/30 bg-brand-danger/10 px-3 py-1.5 text-xs font-medium text-brand-danger transition hover:bg-brand-danger/15'
    : 'rounded-full border border-panelBorder bg-panelAlt px-3 py-1.5 text-xs font-medium text-copy-secondary transition hover:border-brand-accent hover:text-copy-strong'
  const showPreview = isImage && previewUrl && !hasPreviewError

  useEffect(() => {
    setHasPreviewError(false)
  }, [previewUrl])

  return (
    <article className="rounded-3xl border border-panelBorder bg-panel p-4 shadow-sm">
      <div className="flex gap-4">
        {showPreview ? (
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-panelBorder bg-panelAlt">
            <Image
              src={previewUrl}
              alt={fileName}
              fill
              unoptimized
              sizes="64px"
              className="object-cover"
              onError={() => {
                setHasPreviewError(true)
                onPreviewError?.()
              }}
            />
          </div>
        ) : (
          <EvidenceFileTypeIcon fileType={fileType} />
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <p className="truncate text-sm font-medium text-copy-strong">{fileName}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-copy-muted">
              <span>{formatEvidenceSize(fileSize)}</span>
              <span>{isPdf ? 'PDF' : isImage ? 'Зображення' : fileType}</span>
              {createdAt ? <span>{new Date(createdAt).toLocaleDateString('uk-UA')}</span> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {statusLabel ? (
              <span className="rounded-full border border-panelBorder bg-panelAlt px-3 py-1 text-xs text-copy-secondary">
                {statusLabel}
              </span>
            ) : null}

            {fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-panelBorder bg-panelAlt px-3 py-1.5 text-xs font-medium text-copy-secondary transition hover:border-brand-accent hover:text-copy-strong"
              >
                {isPdf ? 'Відкрити PDF' : 'Переглянути файл'}
              </a>
            ) : null}

            {action ? (
              <button type="button" className={actionClassName} onClick={action.onClick}>
                {action.label}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
