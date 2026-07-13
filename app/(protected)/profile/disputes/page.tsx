import EmptyState from '@/components/profile/EmptyState'
import ProfileSection from '@/components/profile/ProfileSection'
import DashboardCard from '@/components/profile/DashboardCard'
import PaginationControls from '@/components/admin/PaginationControls'
import DisputeSummaryList from '@/components/disputes/DisputeSummaryList'
import { getCurrentUser } from '@/lib/session/getSession'
import { getProfileDisputesPageData } from '@/app/(protected)/profile/_lib/profile-disputes.data'

export default async function ProfileDisputesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getProfileDisputesPageData(user, await searchParams)

  return (
    <ProfileSection
      eyebrow="Суперечки"
      title="Мої суперечки"
      description="Відстежуйте спори по замовленнях, відповідайте в діалозі та додавайте нові докази."
    >
      <DashboardCard
        title="Список суперечок"
        description="Тут зібрані всі звернення щодо проблемних замовлень, які ви вже відкрили."
      >
        <div className="space-y-5 p-5 sm:p-6">
          <form method="GET" className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-copy-secondary">
              <span>Статус</span>
              <select
                name="status"
                defaultValue={data.filters.status ?? ''}
                className="ui-native-select rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
              >
                <option value="">Усі</option>
                <option value="OPEN">Відкрито</option>
                <option value="UNDER_REVIEW">На розгляді</option>
                <option value="WAITING_BUYER">Очікуємо покупця</option>
                <option value="WAITING_SELLER">Очікуємо продавця</option>
                <option value="ESCALATED">Ескальовано</option>
                <option value="RESOLVED">Вирішено</option>
                <option value="REJECTED">Відхилено</option>
                <option value="CLOSED">Закрито</option>
              </select>
            </label>
            <button type="submit" className="ui-secondary-button">
              Застосувати
            </button>
          </form>

          {data.items.length === 0 ? (
            <EmptyState
              title="Суперечок поки що немає"
              description="Якщо з замовленням виникне проблема, ви зможете відкрити суперечку зі сторінки деталей замовлення."
              actionHref="/profile/orders"
              actionLabel="Перейти до замовлень"
            />
          ) : (
            <>
              <DisputeSummaryList disputes={data.items} detailBasePath="/profile/disputes" />
              <PaginationControls
                pathname="/profile/disputes"
                page={data.page}
                limit={data.limit}
                total={data.total}
                query={{
                  status: data.filters.status,
                }}
              />
            </>
          )}
        </div>
      </DashboardCard>
    </ProfileSection>
  )
}
