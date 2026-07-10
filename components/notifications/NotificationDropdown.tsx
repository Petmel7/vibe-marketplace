'use client'

import Link from 'next/link'
import NotificationList from './NotificationList'
import type { Notification } from '@/types/notifications'

export default function NotificationDropdown({
  items,
  isLoading,
  isMarkingAllRead,
  errorMessage,
  onClose,
  onMarkAllRead,
  onMarkAsRead,
  onOpen,
  onRetry,
  unreadCount,
}: {
  items: Notification[]
  isLoading: boolean
  isMarkingAllRead: boolean
  errorMessage: string | null
  onClose: () => void
  onMarkAllRead: () => Promise<unknown> | void
  onMarkAsRead: (id: string) => Promise<unknown> | void
  onOpen: (notification: Notification) => Promise<unknown> | void
  onRetry: () => Promise<unknown> | void
  unreadCount: number
}) {
  return (
    <div
      role="dialog"
      aria-label="Центр сповіщень"
      className="absolute right-0 top-full z-40 mt-3 w-[min(26rem,calc(100vw-1.5rem))] rounded-2xl border border-panelBorder bg-panel p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Notification Center</p>
          <h2 className="mt-2 text-lg font-semibold text-copy-strong">Сповіщення</h2>
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            className="ui-link-muted"
            disabled={isMarkingAllRead}
            onClick={() => void onMarkAllRead()}
          >
            {isMarkingAllRead ? 'Оновлюємо…' : 'Позначити все'}
          </button>
        ) : null}
      </div>

      <div className="mt-4 max-h-112 overflow-y-auto pr-1">
        <NotificationList
          compact
          errorMessage={errorMessage}
          isLoading={isLoading}
          items={items}
          onMarkAsRead={onMarkAsRead}
          onOpen={onOpen}
          onRetry={onRetry}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-panelBorder pt-4">
        <Link href="/notifications" className="ui-secondary-button" onClick={onClose}>
          Усі сповіщення
        </Link>

        <button type="button" className="ui-link-muted" onClick={onClose}>
          Закрити
        </button>
      </div>
    </div>
  )
}
