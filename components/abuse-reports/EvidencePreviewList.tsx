'use client'

import { useCallback, useMemo } from 'react'
import type { AbuseReportEvidence } from '@/types/abuse-reports'
import { useLocalFilePreviewUrls } from '@/components/shared/useLocalFilePreviewUrls'
import EvidenceFileCard from './EvidenceFileCard'
import { buildEvidenceCountLabel, isImageEvidenceType } from './evidence.shared'

type LocalEvidenceFile = {
  id: string
  file: File
}

export default function EvidencePreviewList({
  files,
  evidence,
  isLoading = false,
  emptyMessage = 'Доказів поки що немає.',
  onRemoveFile,
  onDeleteEvidence,
}: {
  files?: LocalEvidenceFile[]
  evidence?: AbuseReportEvidence[] | null
  isLoading?: boolean
  emptyMessage?: string
  onRemoveFile?: (id: string) => void
  onDeleteEvidence?: (id: string) => void
}) {
  const hasLocalFiles = Boolean(files?.length)
  const hasSavedEvidence = Boolean(evidence?.length)
  const countLabel = useMemo(
    () => buildEvidenceCountLabel(evidence ?? null, isLoading),
    [evidence, isLoading],
  )
  const localFiles = files ?? []
  const isPreviewable = useCallback((file: File) => isImageEvidenceType(file.type), [])
  const { getPreviewUrl, markPreviewBroken } = useLocalFilePreviewUrls({
    files: localFiles,
    isPreviewable,
  })

  if (!hasLocalFiles && !hasSavedEvidence && !isLoading) {
    return <p className="text-sm text-copy-muted">{emptyMessage}</p>
  }

  return (
    <div className="space-y-3">
      {evidence ? (
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-copy-muted">{countLabel}</p>
      ) : null}

      {isLoading ? (
        <div className="rounded-3xl border border-panelBorder bg-panelAlt px-4 py-4 text-sm text-copy-muted">
          Завантажуємо докази...
        </div>
      ) : null}

      {files?.map((item) => (
        <EvidenceFileCard
          key={item.id}
          fileName={item.file.name}
          fileType={item.file.type}
          fileSize={item.file.size}
          previewUrl={getPreviewUrl(item.id)}
          onPreviewError={() => markPreviewBroken(item.id)}
          statusLabel="Буде завантажено після створення скарги"
          action={
            onRemoveFile
              ? { label: 'Прибрати', onClick: () => onRemoveFile(item.id), tone: 'danger' }
              : undefined
          }
        />
      ))}

      {evidence?.map((item) => (
        <EvidenceFileCard
          key={item.id}
          fileName={item.fileName}
          fileType={item.fileType}
          fileSize={item.fileSize}
          previewUrl={item.url}
          fileUrl={item.url}
          createdAt={item.createdAt}
          action={
            onDeleteEvidence
              ? { label: 'Видалити', onClick: () => onDeleteEvidence(item.id), tone: 'danger' }
              : undefined
          }
        />
      ))}
    </div>
  )
}
