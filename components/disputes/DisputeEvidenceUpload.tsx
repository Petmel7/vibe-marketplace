'use client'

import { useEffect, useMemo, useState } from 'react'
import EvidenceFileCard from '@/components/abuse-reports/EvidenceFileCard'
import {
  getDisputeEvidenceAcceptValue,
  isDisputeImageEvidence,
  MAX_DISPUTE_EVIDENCE_FILES,
} from './dispute-evidence.shared'

type LocalEvidenceFile = {
  id: string
  file: File
}

export default function DisputeEvidenceUpload({
  selectedFiles,
  onFilesSelected,
  onRemoveFile,
  disabled = false,
  errorMessage,
}: {
  selectedFiles: LocalEvidenceFile[]
  onFilesSelected: (files: FileList | null) => void
  onRemoveFile: (id: string) => void
  disabled?: boolean
  errorMessage?: string | null
}) {
  const [brokenPreviewIds, setBrokenPreviewIds] = useState<string[]>([])
  const previewEntries = useMemo(
    () =>
      selectedFiles
        .filter((item) => isDisputeImageEvidence(item.file.type))
        .map((item) => ({
          id: item.id,
          url: URL.createObjectURL(item.file),
        })),
    [selectedFiles],
  )
  const previewUrlById = useMemo(
    () => new Map(previewEntries.map((entry) => [entry.id, entry.url])),
    [previewEntries],
  )

  useEffect(() => {
    return () => {
      for (const entry of previewEntries) {
        URL.revokeObjectURL(entry.url)
      }
    }
  }, [previewEntries])

  useEffect(() => {
    const activeIds = new Set(selectedFiles.map((item) => item.id))
    setBrokenPreviewIds((current) => current.filter((id) => activeIds.has(id)))
  }, [selectedFiles])

  return (
    <div className="space-y-3">
      <label className="block space-y-2">
        <span className="block text-sm font-medium text-copy-strong">Докази</span>
        <input
          type="file"
          accept={getDisputeEvidenceAcceptValue()}
          multiple
          disabled={disabled}
          aria-invalid={errorMessage ? 'true' : 'false'}
          aria-describedby={errorMessage ? 'dispute-evidence-error' : 'dispute-evidence-help'}
          className="block w-full rounded-2xl border border-dashed border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-secondary file:mr-3 file:rounded-full file:border-0 file:bg-background file:px-4 file:py-2 file:text-sm file:font-medium file:text-copy-strong hover:border-brand-accent focus:outline-none"
          onChange={(event) => {
            onFilesSelected(event.target.files)
            event.currentTarget.value = ''
          }}
        />
      </label>

      <p id="dispute-evidence-help" className="text-xs text-copy-muted">
        До {MAX_DISPUTE_EVIDENCE_FILES} файлів: JPG, PNG, WEBP або PDF, до 10MB кожен.
      </p>

      {errorMessage ? (
        <p
          id="dispute-evidence-error"
          className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary"
          aria-live="polite"
        >
          {errorMessage}
        </p>
      ) : null}

      {selectedFiles.length > 0 ? (
        <div className="space-y-3">
          {selectedFiles.map((item) => (
            <EvidenceFileCard
              key={item.id}
              fileName={item.file.name}
              fileType={item.file.type}
              fileSize={item.file.size}
              previewUrl={
                brokenPreviewIds.includes(item.id) ? null : (previewUrlById.get(item.id) ?? null)
              }
              onPreviewError={() => {
                setBrokenPreviewIds((current) =>
                  current.includes(item.id) ? current : [...current, item.id],
                )
              }}
              statusLabel="Буде завантажено після відправлення"
              action={{
                label: 'Прибрати',
                onClick: () => onRemoveFile(item.id),
                tone: 'danger',
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
