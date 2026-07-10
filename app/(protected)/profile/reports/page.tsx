import ProfileSection from '@/components/profile/ProfileSection'
import DashboardCard from '@/components/profile/DashboardCard'
import EmptyState from '@/components/profile/EmptyState'
import MyReportsList from '@/components/abuse-reports/MyReportsList'
import { getCurrentUser } from '@/lib/session/getSession'
import { getProfileReportsPageData } from '@/app/(protected)/profile/_lib/profile-reports.data'

export default async function ProfileReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getProfileReportsPageData(user, await searchParams)

  return (
    <ProfileSection
      eyebrow="Безпека"
      title="Мої скарги"
      description="Переглядайте статус своїх звернень до команди безпеки маркетплейсу."
    >
      <DashboardCard
        title="Історія звернень"
        description="Тут зібрані ваші скарги на товари, відгуки, магазини та замовлення."
      >
        {data.items.length === 0 ? (
          <EmptyState
            title="Скарг поки що немає"
            description="Коли ви надішлете перше звернення через товар, магазин, відгук або замовлення, воно з’явиться тут."
            actionHref="/catalog"
            actionLabel="Перейти до каталогу"
          />
        ) : (
          <MyReportsList reports={data.items} />
        )}
      </DashboardCard>
    </ProfileSection>
  )
}
