'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import NotificationDropdown from './NotificationDropdown'
import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const {
    hasRecentRealtimeActivity,
    isRealtimeConnected,
    items,
    unreadCount,
    isLoadingList,
    isMarkingAllRead,
    listError,
    loadNotifications,
    loadUnreadCount,
    markAllRead,
    markAsRead,
    openNotification,
  } = useNotifications({
    autoLoadCount: true,
    autoLoadList: false,
    limit: 8,
    liveListEnabled: isOpen,
  })

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    void loadNotifications()
    void loadUnreadCount()
  }, [isOpen, loadNotifications, loadUnreadCount])

  const label =
    unreadCount > 0
      ? `Сповіщення, ${unreadCount} непрочитаних`
      : 'Сповіщення'

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={label}
        className="ui-icon-button relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Bell size={24} color="#E8E9EA" aria-hidden="true" />
        {hasRecentRealtimeActivity ? (
          <span
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-panel bg-emerald-400"
            aria-hidden="true"
          />
        ) : null}
        {unreadCount > 0 ? (
          <span className="ui-badge-counter" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
        <span className="sr-only" aria-live="polite">
          {hasRecentRealtimeActivity
            ? 'Нове сповіщення отримано.'
            : !isRealtimeConnected
              ? 'Підключення до сповіщень відновлюється.'
              : ''}
        </span>
      </button>

      {isOpen ? (
        <NotificationDropdown
          errorMessage={listError}
          isLoading={isLoadingList}
          isMarkingAllRead={isMarkingAllRead}
          items={items}
          onClose={() => setIsOpen(false)}
          onMarkAllRead={markAllRead}
          onMarkAsRead={markAsRead}
          onOpen={async (notification) => {
            setIsOpen(false)
            await openNotification(notification)
          }}
          onRetry={loadNotifications}
          unreadCount={unreadCount}
        />
      ) : null}
    </div>
  )
}
