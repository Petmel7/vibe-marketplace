'use client'

import { useMemo, useState } from 'react'
import { disputesApi } from '@/components/disputes/api/disputes.api'
import {
  getDisputeEvidenceValidationError,
  MAX_DISPUTE_EVIDENCE_FILES,
} from '@/components/disputes/dispute-evidence.shared'
import type { CreateDisputeInput, DisputeReason } from '@/types/disputes'

type UseDisputeFormOptions = {
  orderId: string
  orderItemId?: string | null
  onSuccess?: (disputeId: string) => void
}

type SelectedEvidenceFile = {
  id: string
  file: File
}

const INITIAL_REASON: DisputeReason = 'ITEM_NOT_AS_DESCRIBED'

export function useDisputeForm({ orderId, orderItemId, onSuccess }: UseDisputeFormOptions) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState<DisputeReason>(INITIAL_REASON)
  const [description, setDescription] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<SelectedEvidenceFile[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fileErrorMessage, setFileErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{
    total: number
    completed: number
    currentFileName: string | null
  } | null>(null)

  const descriptionError = useMemo(() => {
    const length = description.trim().length
    return length >= 10 ? null : 'Опишіть проблему щонайменше 10 символами.'
  }, [description])

  function reset() {
    setReason(INITIAL_REASON)
    setDescription('')
    setSelectedFiles([])
    setErrorMessage(null)
    setFileErrorMessage(null)
    setSuccessMessage(null)
    setUploadProgress(null)
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
    if (!files?.length) {
      return
    }

    const nextFiles = [...selectedFiles]
    for (const file of Array.from(files)) {
      const validationError = getDisputeEvidenceValidationError(file)
      if (validationError) {
        setFileErrorMessage(validationError)
        return
      }

      if (nextFiles.length >= MAX_DISPUTE_EVIDENCE_FILES) {
        setFileErrorMessage(`До суперечки можна додати не більше ${MAX_DISPUTE_EVIDENCE_FILES} файлів.`)
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

    setIsPending(true)
    setErrorMessage(null)
    setFileErrorMessage(null)
    setSuccessMessage(null)

    try {
      const payload: CreateDisputeInput = {
        orderId,
        reason,
        description: description.trim(),
        ...(orderItemId ? { orderItemId } : {}),
      }

      const dispute = await disputesApi.create(payload)

      if (selectedFiles.length > 0) {
        for (let index = 0; index < selectedFiles.length; index += 1) {
          const item = selectedFiles[index]
          setUploadProgress({
            total: selectedFiles.length,
            completed: index,
            currentFileName: item.file.name,
          })
          await disputesApi.uploadEvidence(dispute.id, item.file)
        }

        setUploadProgress({
          total: selectedFiles.length,
          completed: selectedFiles.length,
          currentFileName: null,
        })
      }

      setSuccessMessage('Суперечку відкрито. Команда маркетплейсу отримала звернення.')
      onSuccess?.(dispute.id)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Не вдалося відкрити суперечку. Спробуйте ще раз.',
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
    uploadProgress,
    open,
    close,
    addFiles,
    removeFile,
    submit,
    setReason,
    setDescription,
  }
}
