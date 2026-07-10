'use client'

import type { Notification } from '@/types/notifications'
import NotificationStatusBadge from './NotificationStatusBadge'
import { NOTIFICATION_TYPE_META, formatNotificationDate } from './notificationMeta'

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onOpen,
  variant = 'page',
}: {
  notification: Notification
  onMarkAsRead: (id: string) => Promise<unknown> | void
  onOpen: (notification: Notification) => Promise<unknown> | void
  variant?: 'dropdown' | 'page'
}) {
  const typeMeta = NOTIFICATION_TYPE_META[notification.type]
  const hasAction = Boolean(notification.actionUrl)

  return (
    <article
      className={`rounded-2xl border px-4 py-4 transition-colors ${notification.readAt
          ? 'border-panelBorder bg-panel/70'
          : 'border-brand/20 bg-brand/5'
        } ${variant === 'dropdown' ? 'shadow-none' : 'shadow-[0_10px_30px_rgba(0,0,0,0.12)]'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-medium uppercase tracking-[0.18em] ${typeMeta.accentClassName}`}>
              {typeMeta.label}
            </span>
            <NotificationStatusBadge readAt={notification.readAt} />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-copy-strong sm:text-base">
              {notification.title}
            </h3>
            <p className="text-sm leading-6 text-copy-secondary">{notification.message}</p>
          </div>
        </div>

        <time className="text-xs text-copy-muted" dateTime={notification.createdAt}>
          {formatNotificationDate(notification.createdAt)}
        </time>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {hasAction ? (
          <button
            type="button"
            className="ui-primary-button"
            onClick={() => void onOpen(notification)}
            aria-label={`Відкрити сповіщення: ${notification.title}`}
          >
            Відкрити
          </button>
        ) : null}

        {!notification.readAt ? (
          <button
            type="button"
            className="ui-link-muted"
            onClick={() => void onMarkAsRead(notification.id)}
            aria-label={`Позначити як прочитане: ${notification.title}`}
          >
            Позначити як прочитане
          </button>
        ) : null}
      </div>
    </article>
  )
}
