'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { HostedPaymentAction } from '@/types/payments'

const AUTO_SUBMIT_STORAGE_PREFIX = 'liqpay-handoff-submitted:'

function getStorageKey(paymentId: string) {
  return `${AUTO_SUBMIT_STORAGE_PREFIX}${paymentId}`
}

export default function LiqPayPaymentHandoff({
  action,
}: {
  action: HostedPaymentAction
}) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const storageKey = useMemo(() => getStorageKey(action.paymentId), [action.paymentId])
  const [autoSubmitBlocked, setAutoSubmitBlocked] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.sessionStorage.getItem(storageKey) === '1'
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (window.sessionStorage.getItem(storageKey) === '1') {
      return
    }

    const form = formRef.current
    if (!form) {
      return
    }

    window.sessionStorage.setItem(storageKey, '1')
    const submitFrame = window.requestAnimationFrame(() => {
      try {
        form.requestSubmit()
      } catch {
        setAutoSubmitBlocked(true)
      }
    })

    const fallbackTimer = window.setTimeout(() => {
      setAutoSubmitBlocked(true)
    }, 1800)

    return () => {
      window.cancelAnimationFrame(submitFrame)
      window.clearTimeout(fallbackTimer)
    }
  }, [storageKey])

  const handleManualSubmit = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(storageKey, '1')
    }

    formRef.current?.requestSubmit()
  }

  return (
    <section
      className="ui-elevated-panel mx-auto max-w-2xl space-y-6 p-6 sm:p-8"
      aria-live="polite"
      aria-busy={!autoSubmitBlocked}
    >
      <div className="space-y-3 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brand-accent/30 bg-brand-accent/10 text-brand-accent">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-r-transparent" />
        </span>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-copy-strong">
            Переадресовуємо на безпечну оплату
          </h2>
          <p className="text-sm text-copy-secondary sm:text-base">
            Відкриваємо захищену сторінку LiqPay, щоб ви могли завершити оплату карткою.
            Статус замовлення оновиться тільки після серверного підтвердження платежу.
          </p>
        </div>
      </div>

      <form
        ref={formRef}
        method="POST"
        action={action.checkoutUrl}
        acceptCharset="utf-8"
        className="hidden"
      >
        <input type="hidden" name="data" value={action.data} />
        <input type="hidden" name="signature" value={action.signature} />
      </form>

      <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4 text-sm text-copy-secondary">
        <p>
          {!autoSubmitBlocked
            ? 'Перехід має розпочатися автоматично протягом кількох секунд.'
            : 'Якщо автоматичний перехід не почався, натисніть кнопку нижче.'}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={handleManualSubmit}
          className="ui-primary-button"
          aria-label="Відкрити захищену сторінку оплати LiqPay"
        >
          Перейти до оплати
        </button>
      </div>
    </section>
  )
}
