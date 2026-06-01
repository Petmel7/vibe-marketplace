'use client'

import type { PaymentMethod } from '@/types/payments'

const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; className: string }> = {
  CARD: {
    label: 'Оплата карткою',
    className: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  },
  APPLE_PAY: {
    label: 'Apple Pay',
    className: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  },
  GOOGLE_PAY: {
    label: 'Google Pay',
    className: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  },
  CASH_ON_DELIVERY: {
    label: 'Післяплата',
    className: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  },
  MANUAL: {
    label: 'Ручне підтвердження',
    className: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  },
}

export function getPaymentMethodLabel(method: PaymentMethod | null | undefined) {
  if (!method) {
    return 'Спосіб оплати'
  }

  return PAYMENT_METHOD_META[method]?.label ?? method
}

export default function PaymentMethodBadge({
  method,
}: {
  method: PaymentMethod | null | undefined
}) {
  const meta = method ? PAYMENT_METHOD_META[method] : null

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
        meta?.className ?? 'border-panelBorder bg-panel text-copy-primary'
      }`}
    >
      {meta?.label ?? 'Спосіб оплати'}
    </span>
  )
}
