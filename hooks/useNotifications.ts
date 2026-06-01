'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ApiError, UnauthorizedError } from '@/shared/api/api.errors'
import { notificationsApi } from '@/components/notifications/api/notifications.api'
import type { Notification } from '@/types/notifications'

type UseNotificationsOptions = {
  autoLoadCount?: boolean
  autoLoadList?: boolean
  limit?: number
  unread?: boolean
}

type NotificationSyncDetail =
  | {
      id: string
      kind: 'read-one'
      originId: string
      readAt: string
    }
  | {
      kind: 'read-all'
      originId: string
      readAt: string
    }

const NOTIFICATION_SYNC_EVENT = 'notifications:sync'

function getErrorMessage(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return 'Потрібно увійти, щоб переглянути сповіщення.'
  }

  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Потрібно увійти, щоб переглянути сповіщення.'
    }

    return error.message
  }

  return 'Не вдалося завантажити сповіщення.'
}

function isExternalActionUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function dispatchNotificationSync(detail: NotificationSyncDetail) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent<NotificationSyncDetail>(NOTIFICATION_SYNC_EVENT, { detail }))
}

export function useNotifications({
  autoLoadCount = true,
  autoLoadList = false,
  limit = 20,
  unread,
}: UseNotificationsOptions = {}) {
  const router = useRouter()
  const instanceIdRef = useRef(`notifications-${Math.random().toString(36).slice(2)}`)
  const didAutoLoadCountRef = useRef(false)
  const didAutoLoadListRef = useRef(false)
  const [items, setItems] = useState<Notification[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoadingList, setIsLoadingList] = useState(autoLoadList)
  const [isLoadingCount, setIsLoadingCount] = useState(autoLoadCount)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [countError, setCountError] = useState<string | null>(null)
  const [isUnauthorized, setIsUnauthorized] = useState(false)

  const hasItems = items.length > 0
  const hasMore = items.length < total

  const loadUnreadCount = useCallback(async () => {
    setIsLoadingCount(true)
    setCountError(null)

    try {
      const data = await notificationsApi.unreadCount()
      setUnreadCount(data.count)
      setIsUnauthorized(false)
    } catch (error) {
      setUnreadCount(0)
      setCountError(getErrorMessage(error))
      setIsUnauthorized(error instanceof UnauthorizedError || (error instanceof ApiError && error.status === 401))
    } finally {
      setIsLoadingCount(false)
    }
  }, [])

  const loadNotifications = useCallback(
    async ({ nextPage = 1, append = false }: { nextPage?: number; append?: boolean } = {}) => {
      setIsLoadingList(true)
      setListError(null)

      try {
        const data = await notificationsApi.list({
          limit,
          page: nextPage,
          unread,
        })

        setItems((current) => (append ? [...current, ...data.items] : data.items))
        setPage(data.page)
        setTotal(data.total)
        setIsUnauthorized(false)
      } catch (error) {
        setListError(getErrorMessage(error))
        setIsUnauthorized(error instanceof UnauthorizedError || (error instanceof ApiError && error.status === 401))
      } finally {
        setIsLoadingList(false)
      }
    },
    [limit, unread],
  )

  const markAsRead = useCallback(
    async (id: string) => {
      const current = items.find((item) => item.id === id)
      if (!current || current.readAt) return current

      const optimisticReadAt = new Date().toISOString()

      setItems((existing) =>
        existing.map((item) => (item.id === id ? { ...item, readAt: optimisticReadAt } : item)),
      )
      setUnreadCount((existing) => Math.max(0, existing - 1))

      try {
        const updated = await notificationsApi.markRead(id)
        setItems((existing) => existing.map((item) => (item.id === id ? updated : item)))
        dispatchNotificationSync({
          kind: 'read-one',
          id,
          originId: instanceIdRef.current,
          readAt: updated.readAt ?? optimisticReadAt,
        })
        return updated
      } catch (error) {
        setItems((existing) =>
          existing.map((item) => (item.id === id ? { ...item, readAt: current.readAt } : item)),
        )
        setUnreadCount((existing) => existing + 1)
        setListError(getErrorMessage(error))
        throw error
      }
    },
    [items],
  )

  const markAllRead = useCallback(async () => {
    const unreadItems = items.filter((item) => !item.readAt)
    if (!unreadItems.length && unreadCount === 0) return

    const optimisticReadAt = new Date().toISOString()
    const previousItems = items
    const previousUnreadCount = unreadCount

    setIsMarkingAllRead(true)
    setItems((existing) => existing.map((item) => ({ ...item, readAt: item.readAt ?? optimisticReadAt })))
    setUnreadCount(0)

    try {
      await notificationsApi.markAllRead()
      dispatchNotificationSync({
        kind: 'read-all',
        originId: instanceIdRef.current,
        readAt: optimisticReadAt,
      })
    } catch (error) {
      setItems(previousItems)
      setUnreadCount(previousUnreadCount)
      setListError(getErrorMessage(error))
      throw error
    } finally {
      setIsMarkingAllRead(false)
    }
  }, [items, unreadCount])

  const openNotification = useCallback(
    async (notification: Notification) => {
      try {
        if (!notification.readAt) {
          await markAsRead(notification.id)
        }
      } catch {
        return
      }

      if (!notification.actionUrl) return

      if (isExternalActionUrl(notification.actionUrl)) {
        window.location.assign(notification.actionUrl)
        return
      }

      router.push(notification.actionUrl)
      router.refresh()
    },
    [markAsRead, router],
  )

  const loadMore = useCallback(async () => {
    if (isLoadingList || !hasMore) return
    await loadNotifications({ nextPage: page + 1, append: true })
  }, [hasMore, isLoadingList, loadNotifications, page])

  useEffect(() => {
    if (!autoLoadCount || didAutoLoadCountRef.current) return
    didAutoLoadCountRef.current = true
    void loadUnreadCount()
  }, [autoLoadCount, loadUnreadCount])

  useEffect(() => {
    if (!autoLoadList || didAutoLoadListRef.current) return
    didAutoLoadListRef.current = true
    void loadNotifications()
  }, [autoLoadList, loadNotifications])

  useEffect(() => {
    const handleSync = (event: Event) => {
      const detail = (event as CustomEvent<NotificationSyncDetail>).detail
      if (!detail || detail.originId === instanceIdRef.current) return

      if (detail.kind === 'read-one') {
        setUnreadCount((existing) => Math.max(0, existing - 1))
        setItems((existing) =>
          existing.map((item) => (item.id === detail.id ? { ...item, readAt: item.readAt ?? detail.readAt } : item)),
        )
        return
      }

      setUnreadCount(0)
      setItems((existing) =>
        existing.map((item) => ({ ...item, readAt: item.readAt ?? detail.readAt })),
      )
    }

    window.addEventListener(NOTIFICATION_SYNC_EVENT, handleSync as EventListener)
    return () => window.removeEventListener(NOTIFICATION_SYNC_EVENT, handleSync as EventListener)
  }, [])

  const summary = useMemo(
    () => ({
      hasItems,
      hasMore,
    }),
    [hasItems, hasMore],
  )

  return {
    items,
    page,
    total,
    unreadCount,
    isLoadingCount,
    isLoadingList,
    isMarkingAllRead,
    isUnauthorized,
    listError,
    countError,
    hasItems: summary.hasItems,
    hasMore: summary.hasMore,
    loadMore,
    loadNotifications,
    loadUnreadCount,
    markAllRead,
    markAsRead,
    openNotification,
  }
}

