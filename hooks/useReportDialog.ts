'use client'

import { useMemo, useState } from 'react'
import { abuseReportsApi } from '@/components/abuse-reports/api/abuse-reports.api'
import {
  getEvidenceValidationError,
  MAX_REPORT_EVIDENCE_FILES,
} from '@/components/abuse-reports/evidence.shared'
import type {
  AbuseReportReason,
  AbuseReportTargetType,
  CreateReportInput,
} from '@/types/abuse-reports'

type UseReportDialogOptions = {
  targetType: AbuseReportTargetType
  targetId: string
  onSuccess?: () => void
}

export type SelectedEvidenceFile = {
  id: string
  file: File
}

const INITIAL_REASON: AbuseReportReason = 'SPAM'

export function useReportDialog({ targetType, targetId, onSuccess }: UseReportDialogOptions) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState<AbuseReportReason>(INITIAL_REASON)
  const [description, setDescription] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<SelectedEvidenceFile[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fileErrorMessage, setFileErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    total: number
    completed: number
    currentFileName: string | null
    failedFileNames: string[]
  } | null>(null)

  const isDescriptionRequired = reason === 'OTHER'

  const descriptionError = useMemo(() => {
    if (!isDescriptionRequired) {
      return null
    }

    return description.trim().length >= 10
      ? null
      : 'Опишіть проблему детальніше, якщо обираєте іншу причину.'
  }, [description, isDescriptionRequired])

  function reset() {
    setReason(INITIAL_REASON)
    setDescription('')
    setSelectedFiles([])
    setErrorMessage(null)
    setFileErrorMessage(null)
    setSuccessMessage(null)
    setUploadStatus(null)
  }

  function open() {
    reset()
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
    reset()
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return
    }

    const nextFiles = [...selectedFiles]

    for (const file of Array.from(files)) {
      const validationError = getEvidenceValidationError(file)
      if (validationError) {
        setFileErrorMessage(validationError)
        return
      }

      if (nextFiles.length >= MAX_REPORT_EVIDENCE_FILES) {
        setFileErrorMessage(`До скарги можна додати не більше ${MAX_REPORT_EVIDENCE_FILES} файлів.`)
        return
      }

      nextFiles.push({
        id: `${crypto.randomUUID()}-${file.name}`,
        file,
      })
    }

    setSelectedFiles(nextFiles)
    setFileErrorMessage(null)
  }

  function removeFile(id: string) {
    setSelectedFiles((current) => current.filter((item) => item.id !== id))
    setFileErrorMessage(null)
  }

  async function submit() {
    if (isPending) {
      return
    }

    if (descriptionError) {
      setErrorMessage(descriptionError)
      return
    }

    if (selectedFiles.length > MAX_REPORT_EVIDENCE_FILES) {
      setFileErrorMessage(`До скарги можна додати не більше ${MAX_REPORT_EVIDENCE_FILES} файлів.`)
      return
    }

    setErrorMessage(null)
    setFileErrorMessage(null)
    setSuccessMessage(null)
    setIsPending(true)

    try {
      const payload: CreateReportInput = {
        targetType,
        targetId,
        reason,
        ...(description.trim() ? { description: description.trim() } : {}),
      }

      const report = await abuseReportsApi.create(payload)
      const failedFileNames: string[] = []

      if (selectedFiles.length > 0) {
        for (let index = 0; index < selectedFiles.length; index += 1) {
          const item = selectedFiles[index]

          setUploadStatus({
            total: selectedFiles.length,
            completed: index,
            currentFileName: item.file.name,
            failedFileNames: [...failedFileNames],
          })

          try {
            await abuseReportsApi.uploadEvidence(report.id, item.file)
          } catch (error) {
            failedFileNames.push(item.file.name)
            setFileErrorMessage(
              error instanceof Error
                ? error.message
                : `Не вдалося завантажити файл ${item.file.name}.`,
            )
          }
        }

        setUploadStatus({
          total: selectedFiles.length,
          completed: selectedFiles.length,
          currentFileName: null,
          failedFileNames: [...failedFileNames],
        })

        if (failedFileNames.length > 0) {
          setSuccessMessage(
            `Скаргу створено, але частину доказів не вдалося завантажити: ${failedFileNames.join(', ')}.`,
          )
        } else {
          setSuccessMessage('Скаргу надіслано разом із доказами. Команда безпеки вже отримала звернення.')
          setSelectedFiles([])
        }
      } else {
        setSuccessMessage('Скаргу надіслано. Команда безпеки вже отримала звернення.')
      }

      onSuccess?.()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Не вдалося надіслати скаргу. Спробуйте ще раз.',
      )
    } finally {
      setIsPending(false)
    }
  }

  return {
    isOpen,
    isPending,
    reason,
    description,
    selectedFiles,
    errorMessage,
    fileErrorMessage,
    successMessage,
    uploadStatus,
    isDescriptionRequired,
    open,
    close,
    submit,
    addFiles,
    removeFile,
    setReason,
    setDescription,
  }
}
