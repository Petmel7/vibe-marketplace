'use client'

import { getEvidenceAcceptValue, MAX_REPORT_EVIDENCE_FILES } from './evidence.shared'

export default function EvidenceUploadField({
  disabled = false,
  errorMessage,
  selectedCount,
  onFilesSelected,
}: {
  disabled?: boolean
  errorMessage?: string | null
  selectedCount: number
  onFilesSelected: (files: FileList | null) => void
}) {
  return (
    <div className="space-y-3">
      <label className="block space-y-2">
        <span className="block text-sm font-medium text-copy-strong">Докази</span>
        <input
          type="file"
          accept={getEvidenceAcceptValue()}
          multiple
          disabled={disabled}
          aria-invalid={errorMessage ? 'true' : 'false'}
          aria-describedby={errorMessage ? 'report-evidence-error' : 'report-evidence-help'}
          className="block w-full rounded-2xl border border-dashed border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-secondary file:mr-3 file:rounded-full file:border-0 file:bg-background file:px-4 file:py-2 file:text-sm file:font-medium file:text-copy-strong hover:border-brand-accent focus:outline-none"
          onChange={(event) => {
            onFilesSelected(event.target.files)
            event.currentTarget.value = ''
          }}
        />
      </label>

      <p id="report-evidence-help" className="text-xs text-copy-muted">
        Можна додати до {MAX_REPORT_EVIDENCE_FILES} файлів: JPG, PNG, WEBP або PDF, до 10MB кожен.
        Зараз вибрано: {selectedCount}.
      </p>

      {errorMessage ? (
        <p
          id="report-evidence-error"
          className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary"
          aria-live="polite"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
