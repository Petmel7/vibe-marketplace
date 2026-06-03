'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { disputesApi } from './api/disputes.api'
import DisputeEvidenceUpload from './DisputeEvidenceUpload'
import {
  getDisputeEvidenceValidationError,
  MAX_DISPUTE_EVIDENCE_FILES,
} from './dispute-evidence.shared'

type SelectedEvidenceFile = {
  id: string
  file: File
}

export default function DisputeEvidenceUploadPanel({
  disputeId,
  existingCount,
}: {
  disputeId: string
  existingCount: number
}) {
  const router = useRouter()
  const [selectedFiles, setSelectedFiles] = useState<SelectedEvidenceFile[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function addFiles(files: FileList | null) {
    if (!files?.length) {
      return
    }

    const nextFiles = [...selectedFiles]

    for (const file of Array.from(files)) {
      const validationError = getDisputeEvidenceValidationError(file)
      if (validationError) {
        setErrorMessage(validationError)
        return
      }

      if (existingCount + nextFiles.length >= MAX_DISPUTE_EVIDENCE_FILES) {
        setErrorMessage(`До суперечки можна додати не більше ${MAX_DISPUTE_EVIDENCE_FILES} файлів.`)
        return
      }

      nextFiles.push({
        id: `${crypto.randomUUID()}-${file.name}`,
        file,
      })
    }

    setSelectedFiles(nextFiles)
    setErrorMessage(null)
  }

  function removeFile(id: string) {
    setSelectedFiles((current) => current.filter((item) => item.id !== id))
  }

  function handleSubmit() {
    if (isPending || selectedFiles.length === 0) {
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        for (const item of selectedFiles) {
          await disputesApi.uploadEvidence(disputeId, item.file)
        }

        setSelectedFiles([])
        setSuccessMessage('Докази додано до суперечки.')
        router.refresh()
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Не вдалося завантажити докази.',
        )
      }
    })
  }

  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-copy-strong">Додати докази</h2>
          <p className="mt-1 text-sm text-copy-muted">
            Прикріпіть фото або PDF, якщо потрібно доповнити суперечку новими матеріалами.
          </p>
        </div>

        <DisputeEvidenceUpload
          disabled={isPending}
          selectedFiles={selectedFiles}
          errorMessage={errorMessage}
          onFilesSelected={addFiles}
          onRemoveFile={removeFile}
        />

        {successMessage ? (
          <p className="rounded-2xl border border-brand-success/30 bg-brand-success/10 px-4 py-3 text-sm text-copy-primary">
            {successMessage}
          </p>
        ) : null}

        <button
          type="button"
          disabled={isPending || selectedFiles.length === 0}
          className="ui-primary-button disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleSubmit}
        >
          {isPending ? 'Завантажуємо...' : 'Додати докази'}
        </button>
      </div>
    </section>
  )
}
