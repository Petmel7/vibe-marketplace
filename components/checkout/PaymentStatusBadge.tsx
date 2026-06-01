'use client'

import type { PaymentStatus } from '@/types/payments'

const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Очікує оплати',
    className: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  },
  PROCESSING: {
    label: 'Обробляється',
    className: 'border-indigo-400/30 bg-indigo-400/10 text-indigo-200',
  },
  SUCCEEDED: {
    label: 'Оплачено',
    className: 'border-brand-success/30 bg-brand-success/10 text-brand-success',
  },
  FAILED: {
    label: 'Неуспішно',
    className: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  },
  CANCELLED: {
    label: 'Скасовано',
    className: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  },
  REFUNDED: {
    label: 'Повернено',
    className: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
  },
  PARTIALLY_REFUNDED: {
    label: 'Частково повернено',
    className: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
  },
}

export function getPaymentStatusLabel(status: PaymentStatus | null | undefined) {
  if (!status) {
    return 'Статус оплати'
  }

  return PAYMENT_STATUS_META[status]?.label ?? status
}

export default function PaymentStatusBadge({
  status,
}: {
  status: PaymentStatus | null | undefined
}) {
  const meta = status ? PAYMENT_STATUS_META[status] : null

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
        meta?.className ?? 'border-panelBorder bg-panel text-copy-primary'
      }`}
    >
      {meta?.label ?? 'Статус оплати'}
    </span>
  )
}
