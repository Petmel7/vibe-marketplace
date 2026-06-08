'use client'

import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import type { Notification } from '@/types/notifications'
import { isNotificationType } from '@/types/notifications'

type UseRealtimeNotificationsOptions = {
  enabled?: boolean
  onNotification: (notification: Notification) => void
  onResync: () => void | Promise<void>
  pollIntervalMs?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function mapNotificationRealtimeRecord(record: Record<string, unknown>): Notification | null {
  const type = typeof record.type === 'string' ? record.type : null
  if (!isNotificationType(type)) {
    return null
  }

  const id = typeof record.id === 'string' ? record.id : null
  const title = typeof record.title === 'string' ? record.title : null
  const message = typeof record.message === 'string' ? record.message : null
  const createdAt = typeof record.created_at === 'string' ? record.created_at : null
  const updatedAt = typeof record.updated_at === 'string' ? record.updated_at : null

  if (!id || !title || !message || !createdAt || !updatedAt) {
    return null
  }

  return {
    id,
    type,
    title,
    message,
    actionUrl: typeof record.action_url === 'string' ? record.action_url : null,
    metadata: isRecord(record.metadata) ? record.metadata : null,
    readAt: typeof record.read_at === 'string' ? record.read_at : null,
    createdAt,
    updatedAt,
  }
}

async function safelyRemoveChannel(channel: RealtimeChannel | null) {
  if (!channel) return

  try {
    await getSupabaseBrowser().removeChannel(channel)
  } catch {
    // Realtime cleanup failures should never break the UI lifecycle.
  }
}

export function useRealtimeNotifications({
  enabled = true,
  onNotification,
  onResync,
  pollIntervalMs = 60000,
}: UseRealtimeNotificationsOptions) {
  const onNotificationRef = useRef(onNotification)
  const onResyncRef = useRef(onResync)
  const channelSequenceRef = useRef(0)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [hasRecentRealtimeActivity, setHasRecentRealtimeActivity] = useState(false)

  useEffect(() => {
    onNotificationRef.current = onNotification
  }, [onNotification])

  useEffect(() => {
    onResyncRef.current = onResync
  }, [onResync])

  useEffect(() => {
    if (enabled) return

    const resetTimeout = window.setTimeout(() => {
      setIsRealtimeConnected(false)
      setHasRecentRealtimeActivity(false)
    }, 0)

    return () => {
      window.clearTimeout(resetTimeout)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let isDisposed = false
    let activeUserId: string | null = null
    let activeChannel: RealtimeChannel | null = null
    let reconnecting = false
    let pollingInterval: ReturnType<typeof setInterval> | null = null
    let recentActivityTimeout: ReturnType<typeof setTimeout> | null = null
    let setupRunId = 0
    let supabase: ReturnType<typeof getSupabaseBrowser>

    const stopPolling = () => {
      if (!pollingInterval) return
      clearInterval(pollingInterval)
      pollingInterval = null
    }

    const startPolling = () => {
      if (pollingInterval || isDisposed) return

      pollingInterval = setInterval(() => {
        void Promise.resolve(onResyncRef.current()).catch(() => {
          // Keep polling as a best-effort fallback only.
        })
      }, pollIntervalMs)
    }

    const markRecentActivity = () => {
      if (isDisposed) return

      setHasRecentRealtimeActivity(true)

      if (recentActivityTimeout) {
        clearTimeout(recentActivityTimeout)
      }

      recentActivityTimeout = setTimeout(() => {
        if (isDisposed) return
        setHasRecentRealtimeActivity(false)
      }, 5000)
    }

    const resetRealtimeState = () => {
      if (isDisposed) return
      setIsRealtimeConnected(false)
    }

    try {
      supabase = getSupabaseBrowser()
    } catch {
      startPolling()
      resetRealtimeState()
      return () => {
        isDisposed = true
        stopPolling()
      }
    }

    const refreshFromServer = async () => {
      try {
        await Promise.resolve(onResyncRef.current())
      } catch {
        // Realtime resync is best-effort; REST remains authoritative.
      }
    }

    const replaceChannel = async (nextChannel: RealtimeChannel | null) => {
      const previousChannel = activeChannel
      activeChannel = nextChannel
      await safelyRemoveChannel(previousChannel)
    }

    const subscribeForUser = async (userId: string, reason: 'initial' | 'session-change') => {
      const runId = ++setupRunId
      activeUserId = userId
      reconnecting = reason !== 'initial' || Boolean(activeChannel)
      resetRealtimeState()
      stopPolling()

      try {
        await replaceChannel(null)

        if (isDisposed || runId !== setupRunId) {
          return
        }

        const channelName = `notifications:user:${userId}:${++channelSequenceRef.current}`
        const nextChannel = supabase.channel(channelName)

        nextChannel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (isDisposed || runId !== setupRunId) return

            const notification = mapNotificationRealtimeRecord(payload.new)
            if (!notification) return

            onNotificationRef.current(notification)
            markRecentActivity()
          },
        )

        nextChannel.subscribe((status) => {
          if (isDisposed || runId !== setupRunId) return

          if (status === 'SUBSCRIBED') {
            setIsRealtimeConnected(true)
            stopPolling()

            if (reconnecting) {
              reconnecting = false
              void refreshFromServer()
            }
            return
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reconnecting = true
            resetRealtimeState()
            startPolling()
            return
          }

          if (status === 'CLOSED') {
            resetRealtimeState()
          }
        })

        if (isDisposed || runId !== setupRunId) {
          await safelyRemoveChannel(nextChannel)
          return
        }

        activeChannel = nextChannel
      } catch {
        if (isDisposed || runId !== setupRunId) return
        reconnecting = true
        resetRealtimeState()
        startPolling()
      }
    }

    const syncSessionSubscription = async (reason: 'initial' | 'session-change') => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (isDisposed) return

        const nextUserId = session?.user?.id ?? null
        if (!nextUserId) {
          activeUserId = null
          resetRealtimeState()
          stopPolling()
          await replaceChannel(null)
          return
        }

        if (activeUserId === nextUserId && activeChannel) {
          return
        }

        await subscribeForUser(nextUserId, reason)
      } catch {
        if (isDisposed) return
        reconnecting = true
        resetRealtimeState()
        startPolling()
      }
    }

    void syncSessionSubscription('initial')

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null

      if (!nextUserId) {
        activeUserId = null
        resetRealtimeState()
        stopPolling()
        void replaceChannel(null)
        return
      }

      if (activeUserId === nextUserId && activeChannel) {
        return
      }

      void subscribeForUser(nextUserId, 'session-change')
    })

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        void refreshFromServer()
      }
    }

    const handleWindowRefresh = () => {
      void refreshFromServer()
    }

    window.addEventListener('focus', handleWindowRefresh)
    window.addEventListener('online', handleWindowRefresh)
    document.addEventListener('visibilitychange', handleVisibilityRefresh)

    return () => {
      isDisposed = true
      subscription.unsubscribe()
      stopPolling()

      if (recentActivityTimeout) {
        clearTimeout(recentActivityTimeout)
      }

      void safelyRemoveChannel(activeChannel)

      window.removeEventListener('focus', handleWindowRefresh)
      window.removeEventListener('online', handleWindowRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityRefresh)
    }
  }, [enabled, pollIntervalMs])

  return {
    isRealtimeConnected,
    hasRecentRealtimeActivity,
  }
}
