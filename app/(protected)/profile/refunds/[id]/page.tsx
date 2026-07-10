import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import DashboardCard from '@/components/profile/DashboardCard'
import ProfileSection from '@/components/profile/ProfileSection'
import RefundDetailCard from '@/components/refunds/RefundDetailCard'
import RefundTimeline from '@/components/refunds/RefundTimeline'
import { getCurrentUser } from '@/lib/session/getSession'
import { getProfileRefundDetailViewState } from '@/app/(protected)/profile/_lib/profile-refunds.data'

export default async function ProfileRefundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params
  const state = await getProfileRefundDetailViewState(user, id)

  if (state.kind === 'not-found') {
    notFound()
  }

  if (state.kind === 'forbidden') {
    return (
      <ProtectedRouteState
        title="Немає доступу до повернення"
        description="Цей запит на повернення недоступний для поточного покупця."
        actionHref="/profile/refunds"
        actionLabel="Назад до повернень"
      />
    )
  }

  const { refund } = state

  return (
    <ProfileSection
      eyebrow="Деталі повернення"
      title={`Повернення #${refund.id.slice(0, 8)}`}
      description="Переглядайте статус, суму повернення та кроки, які backend уже зафіксував по вашому запиту."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/profile/orders/${refund.orderId}`} className="ui-link-muted">
          Відкрити замовлення
        </Link>
        <Link href="/profile/refunds" className="ui-link-muted">
          Назад до повернень
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_360px]">
        <div className="space-y-6">
          <RefundDetailCard refund={refund} />
          <DashboardCard
            title="Що далі"
            description="Рішення, результат обробки та доступний залишок на повернення завжди визначаються тільки backend-ом."
          >
            <div className="space-y-3 p-5 text-sm leading-6 text-copy-secondary sm:p-6">
              <p>Стежте за таймлайном нижче, щоб побачити перехід у review, processing або фінальний результат.</p>
              <p>Якщо маркетплейс запросить додаткові деталі, вони з’являться в оновленому статусі вашого повернення.</p>
            </div>
          </DashboardCard>
        </div>

        <div className="space-y-6">
          <RefundTimeline refund={refund} />
        </div>
      </div>
    </ProfileSection>
  )
}
