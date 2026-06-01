import type { NotificationType } from '@/types/notifications'

export const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  { accentClassName: string; label: string }
> = {
  ORDER_CREATED: {
    label: 'Замовлення',
    accentClassName: 'text-sky-200',
  },
  PAYMENT_SUCCEEDED: {
    label: 'Оплата',
    accentClassName: 'text-emerald-200',
  },
  PAYMENT_FAILED: {
    label: 'Оплата',
    accentClassName: 'text-rose-200',
  },
  ORDER_SHIPPED: {
    label: 'Доставка',
    accentClassName: 'text-indigo-200',
  },
  SELLER_APPROVED: {
    label: 'Магазин',
    accentClassName: 'text-emerald-200',
  },
  SELLER_REJECTED: {
    label: 'Магазин',
    accentClassName: 'text-rose-200',
  },
  PRODUCT_APPROVED: {
    label: 'Товар',
    accentClassName: 'text-emerald-200',
  },
  PRODUCT_REJECTED: {
    label: 'Товар',
    accentClassName: 'text-rose-200',
  },
  SELLER_NEW_ORDER: {
    label: 'Продажі',
    accentClassName: 'text-amber-200',
  },
  ADMIN_ALERT: {
    label: 'Адмін',
    accentClassName: 'text-fuchsia-200',
  },
}

export function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

