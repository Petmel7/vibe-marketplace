'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOrderRoute } from '@/lib/constants/apiRoutes'
import { apiClient } from '@/shared/api/api.client'
import type { CheckoutOrderDetail } from '@/types/orders'
import {
  isFailedPaymentStatus,
  isPaidOrderStatus,
  isSuccessfulPaymentStatus,
} from '@/types/orders'

const POLL_INTERVAL_MS = 4_000
const POLL_TIMEOUT_MS = 45_000

export type CheckoutPollingPhase =
  | 'idle'
  | 'polling'
  | 'redirecting'
  | 'failed'
  | 'timed_out'

function shouldResolveAsSuccess(order: CheckoutOrderDetail) {
  return isSuccessfulPaymentStatus(order.paymentStatus) || isPaidOrderStatus(order.status)
}

function shouldResolveAsFailure(order: CheckoutOrderDetail) {
  return isFailedPaymentStatus(order.paymentStatus)
}

export function useCheckoutOrderPolling(initialOrder: CheckoutOrderDetail, enabled = true) {
  const router = useRouter()
  const [order, setOrder] = useState(initialOrder)
  const [phase, setPhase] = useState<CheckoutPollingPhase>(() => {
    if (!enabled) {
      return 'idle'
    }

    if (shouldResolveAsSuccess(initialOrder)) {
      return 'redirecting'
    }

    if (shouldResolveAsFailure(initialOrder)) {
      return 'failed'
    }

    return 'polling'
  })
  const [lastError, setLastError] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const inFlightRef = useRef(false)

  useEffect(() => {
    setOrder(initialOrder)

    if (!enabled) {
      setPhase('idle')
      return
    }

    if (shouldResolveAsSuccess(initialOrder)) {
      setPhase('redirecting')
      return
    }

    if (shouldResolveAsFailure(initialOrder)) {
      setPhase('failed')
      return
    }

    setPhase('polling')
  }, [enabled, initialOrder])

  useEffect(() => {
    if (!enabled || !shouldResolveAsSuccess(order)) {
      return
    }

    setPhase('redirecting')
    router.replace(`/checkout/success/${order.id}`, { scroll: false })
  }, [enabled, order, router])

  useEffect(() => {
    if (!enabled || phase !== 'polling') {
      return
    }

    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setPhase('timed_out')
      }
    }, POLL_TIMEOUT_MS)

    const poll = async () => {
      if (inFlightRef.current || cancelled) {
        return
      }

      inFlightRef.current = true

      try {
        const nextOrder = await apiClient.get<CheckoutOrderDetail>(getOrderRoute(order.id))
        if (cancelled) {
          return
        }

        setOrder(nextOrder)
        setLastError(null)
        setPollCount((current) => current + 1)

        if (shouldResolveAsFailure(nextOrder)) {
          setPhase('failed')
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Не вдалося оновити статус платежу.'
          setLastError(message)
        }
      } finally {
        inFlightRef.current = false
      }
    }

    void poll()
    const intervalId = window.setInterval(() => {
      void poll()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      inFlightRef.current = false
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [enabled, order.id, phase])

  const isPolling = phase === 'polling'
  const isTimedOut = phase === 'timed_out'
  const isFailure = phase === 'failed'
  const isRedirecting = phase === 'redirecting'

  return useMemo(
    () => ({
      order,
      phase,
      isPolling,
      isTimedOut,
      isFailure,
      isRedirecting,
      pollCount,
      lastError,
    }),
    [isFailure, isPolling, isRedirecting, isTimedOut, lastError, order, phase, pollCount],
  )
}
