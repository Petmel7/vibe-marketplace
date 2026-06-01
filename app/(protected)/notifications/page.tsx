import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import NotificationsPageClient from '@/components/notifications/NotificationsPageClient'
import { getCurrentUser } from '@/lib/session/getSession'

export const metadata: Metadata = {
  title: 'Сповіщення — Вайб',
}

export default async function NotificationsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?notice=auth-required&next=/notifications')
  }

  return <NotificationsPageClient />
}

