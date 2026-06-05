'use client'

import NotificationList from './NotificationList'
import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationsPageClient() {
  const {
    hasMore,
    hasRecentRealtimeActivity,
    isLoadingList,
    isMarkingAllRead,
    isRealtimeConnected,
    items,
    listError,
    loadMore,
    loadNotifications,
    markAllRead,
    markAsRead,
    openNotification,
    unreadCount,
  } = useNotifications({
    autoLoadCount: true,
    autoLoadList: true,
    limit: 20,
    liveListEnabled: true,
  })

  return (
    <section className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 rounded-[32px] border border-panelBorder bg-panel px-6 py-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)] sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-panelBorder bg-canvas px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-copy-muted">
            Notification Center
          </span>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-copy-strong sm:text-4xl">Ваші сповіщення</h1>
            <p className="max-w-2xl text-sm leading-6 text-copy-secondary sm:text-base">
              Слідкуйте за статусами замовлень, оплат, модерації та важливими подіями маркетплейсу в одному місці.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
            Непрочитаних: {unreadCount}
          </span>
          {hasRecentRealtimeActivity ? (
            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
              Оновлено щойно
            </span>
          ) : null}
          {!isRealtimeConnected ? (
            <span
              className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-200"
              aria-live="polite"
            >
              Відновлюємо підключення до realtime
            </span>
          ) : null}
          <button
            type="button"
            className="ui-secondary-button"
            disabled={unreadCount === 0 || isMarkingAllRead}
            onClick={() => void markAllRead()}
          >
            {isMarkingAllRead ? 'Оновлюємо…' : 'Позначити все як прочитане'}
          </button>
        </div>
      </div>

      <NotificationList
        errorMessage={listError}
        isLoading={isLoadingList}
        items={items}
        onMarkAsRead={markAsRead}
        onOpen={openNotification}
        onRetry={loadNotifications}
      />

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="ui-secondary-button"
            disabled={isLoadingList}
            onClick={() => void loadMore()}
          >
            {isLoadingList ? 'Завантажуємо…' : 'Показати ще'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
