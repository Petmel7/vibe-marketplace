'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type ApiSuccess<T> = { success: true; data: T }
type ApiError = { success: false; error?: { message?: string; code?: string } }

type ExecuteOptions<T> = {
  url: string
  method?: 'POST' | 'PATCH'
  body?: unknown
  successMessage: string
  fallbackErrorMessage?: string
  onSuccess?: (data: T) => void | Promise<void>
}

export function useAdminMutation() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const execute = <T,>({
    url,
    method = 'POST',
    body,
    successMessage,
    fallbackErrorMessage = 'We could not complete that admin action right now. Please try again.',
    onSuccess,
  }: ExecuteOptions<T>) =>
    new Promise<T | null>((resolve) => {
      setErrorMessage(null)

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
            toast.error(message)
            resolve(null)
            return
          }

          toast.success(successMessage)

          if (onSuccess) {
            await onSuccess(json.data)
          }

          router.refresh()
          resolve(json.data)
        } catch {
          setErrorMessage(fallbackErrorMessage)
          toast.error(fallbackErrorMessage)
          resolve(null)
        }
      })
    })

  return {
    execute,
    errorMessage,
    isPending,
    setErrorMessage,
  }
}
