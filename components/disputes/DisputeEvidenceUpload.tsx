'use client'

import { useCallback } from 'react'
import EvidenceFileCard from '@/components/abuse-reports/EvidenceFileCard'
import { useLocalFilePreviewUrls } from '@/components/shared/useLocalFilePreviewUrls'
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
  const isPreviewable = useCallback((file: File) => isDisputeImageEvidence(file.type), [])
  const { getPreviewUrl, markPreviewBroken } = useLocalFilePreviewUrls({
    files: selectedFiles,
    isPreviewable,
  })

  return (
    <div className="space-y-3">
      <label className="block space-y-2">
        <span className="block text-sm font-medium text-copy-strong">Р”РѕРєР°Р·Рё</span>
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
        Р”Рѕ {MAX_DISPUTE_EVIDENCE_FILES} С„Р°Р№Р»С–РІ: JPG, PNG, WEBP Р°Р±Рѕ PDF, РґРѕ 10MB РєРѕР¶РµРЅ.
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
              previewUrl={getPreviewUrl(item.id)}
              onPreviewError={() => markPreviewBroken(item.id)}
              statusLabel="Р‘СѓРґРµ Р·Р°РІР°РЅС‚Р°Р¶РµРЅРѕ РїС–СЃР»СЏ РІС–РґРїСЂР°РІР»РµРЅРЅСЏ"
              action={{
                label: 'РџСЂРёР±СЂР°С‚Рё',
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
