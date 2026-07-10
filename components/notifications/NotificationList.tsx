'use client'

import type { Notification } from '@/types/notifications'
import NotificationEmptyState from './NotificationEmptyState'
import NotificationItem from './NotificationItem'

export default function NotificationList({
  compact = false,
  errorMessage,
  isLoading,
  items,
  onMarkAsRead,
  onOpen,
  onRetry,
}: {
  compact?: boolean
  errorMessage?: string | null
  isLoading?: boolean
  items: Notification[]
  onMarkAsRead: (id: string) => Promise<unknown> | void
  onOpen: (notification: Notification) => Promise<unknown> | void
  onRetry?: () => Promise<unknown> | void
}) {
  if (isLoading) {
    return (
      <div
        aria-live="polite"
        className={`space-y-3 ${compact ? '' : 'rounded-2xl border border-panelBorder bg-panel p-4 sm:p-6'}`}
      >
        <p className="text-sm text-copy-muted">Завантажуємо сповіщення…</p>
        <div className="space-y-3">
          {Array.from({ length: compact ? 3 : 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-panelBorder bg-canvas/70"
            />
          ))}
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 px-4 py-5">
        <p className="text-sm font-medium text-rose-100">{errorMessage}</p>
        {onRetry ? (
          <button type="button" className="ui-link-muted mt-3" onClick={() => void onRetry()}>
            Спробувати ще раз
          </button>
        ) : null}
      </div>
    )
  }

  if (!items.length) {
    return <NotificationEmptyState compact={compact} />
  }

  return (
    <div className="space-y-3">
      {items.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
          onOpen={onOpen}
          variant={compact ? 'dropdown' : 'page'}
        />
      ))}
    </div>
  )
}
