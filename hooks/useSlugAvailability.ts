'use client'

import { useEffect, useState } from 'react'

type SlugAvailabilityState =
  | { status: 'idle'; message: string; suggestion: null }
  | { status: 'checking'; message: string; suggestion: null }
  | { status: 'available'; message: string; suggestion: null }
  | { status: 'unavailable'; message: string; suggestion: string | null }
  | { status: 'error'; message: string; suggestion: null }

export function useSlugAvailability(slug: string, enabled = true) {
  const idleState: SlugAvailabilityState = {
    status: 'idle',
    message: 'Choose a public storefront URL for your marketplace presence.',
    suggestion: null,
  }
  const [state, setState] = useState<SlugAvailabilityState>({
    status: 'idle',
    message: 'Choose a public storefront URL for your marketplace presence.',
    suggestion: null,
  })

  useEffect(() => {
    if (!enabled || !slug.trim()) {
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setState({
        status: 'checking',
        message: 'Checking availability...',
        suggestion: null,
      })

      try {
        const response = await fetch(`/api/seller/storefront/slug?slug=${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        })
        const json = (await response.json()) as
          | { success: true; data: { available: boolean; suggestion: string | null } }
          | { success: false; error?: { message?: string } }

        if (!response.ok || !json.success) {
          setState({
            status: 'error',
            message: 'Unable to validate slug right now.',
            suggestion: null,
          })
          return
        }

        if (json.data.available) {
          setState({
            status: 'available',
            message: 'This storefront URL is available.',
            suggestion: null,
          })
          return
        }

        setState({
          status: 'unavailable',
          message: 'This storefront URL is already in use.',
          suggestion: json.data.suggestion,
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setState({
          status: 'error',
          message: 'Unable to validate slug right now.',
          suggestion: null,
        })
      }
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [enabled, slug])

  if (!enabled || !slug.trim()) {
    return idleState
  }

  return state
}
