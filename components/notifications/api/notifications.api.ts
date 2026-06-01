'use client'

import { apiClient } from '@/shared/api/api.client'
import {
  API_ROUTES,
  getNotificationReadRoute,
} from '@/lib/constants/apiRoutes'
import type {
  Notification,
  NotificationListResponse,
  NotificationMutationResponse,
  NotificationUnreadCountResponse,
} from '@/types/notifications'

type NotificationListQuery = {
  limit?: number
  page?: number
  unread?: boolean
}

function buildNotificationListUrl(query: NotificationListQuery = {}) {
  const params = new URLSearchParams()

  if (typeof query.limit === 'number') {
    params.set('limit', String(query.limit))
  }

  if (typeof query.page === 'number') {
    params.set('page', String(query.page))
  }

  if (typeof query.unread === 'boolean') {
    params.set('unread', String(query.unread))
  }

  const search = params.toString()
  return search ? `${API_ROUTES.notifications}?${search}` : API_ROUTES.notifications
}

export const notificationsApi = {
  list(query: NotificationListQuery = {}) {
    return apiClient.get<NotificationListResponse>(buildNotificationListUrl(query), {
      auth: true,
    })
  },

  unreadCount() {
    return apiClient.get<NotificationUnreadCountResponse>(API_ROUTES.notificationsUnreadCount, {
      auth: true,
    })
  },

  markRead(id: string) {
    return apiClient.patch<Notification>(getNotificationReadRoute(id), undefined, {
      auth: true,
    })
  },

  markAllRead() {
    return apiClient.patch<NotificationMutationResponse>(API_ROUTES.notificationsReadAll, undefined, {
      auth: true,
    })
  },
}

