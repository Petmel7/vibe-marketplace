'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type ApiSuccess<T> = { success: true; data: T }
type ApiError = {
  success: false
  error?: {
    message?: string
    code?: string
    details?: Record<string, string[]>
  }
}

type ExecuteOptions<T> = {
  url: string
  method?: 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  successMessage?: string
  errorMessage?: string
  refresh?: boolean
  onSuccess?: (data: T) => void | Promise<void>
}

export function useSellerMutation() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<Record<string, string[]> | null>(null)

  const execute = <T,>({
    url,
    method = 'POST',
    body,
    successMessage,
    errorMessage: fallbackErrorMessage = 'Something went wrong. Please try again.',
    refresh = true,
    onSuccess,
  }: ExecuteOptions<T>) =>
    new Promise<T | null>((resolve) => {
      setErrorMessage(null)
      setErrorDetails(null)

      startTransition(async () => {
        try {
          const response = await fetch(url, {
            method,
            headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
            body: body !== undefined ? JSON.stringify(body) : undefined,
          })

          const json = (await response.json()) as ApiSuccess<T> | ApiError

          if (!response.ok || !json.success) {
            const message = json.success ? fallbackErrorMessage : json.error?.message || fallbackErrorMessage
            setErrorMessage(message)
            setErrorDetails(json.success ? null : json.error?.details ?? null)
            toast.error(message)
            resolve(null)
            return
          }

          if (successMessage) {
            toast.success(successMessage)
          }

          if (onSuccess) {
            await onSuccess(json.data)
          }

          if (refresh) {
            router.refresh()
          }

          resolve(json.data)
        } catch {
          setErrorMessage(fallbackErrorMessage)
          setErrorDetails(null)
          toast.error(fallbackErrorMessage)
          resolve(null)
        }
      })
    })

  return {
    isPending,
    errorMessage,
    setErrorMessage,
    errorDetails,
    setErrorDetails,
    execute,
  }
}
