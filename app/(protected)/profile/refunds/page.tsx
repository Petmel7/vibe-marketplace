import PaginationControls from '@/components/admin/PaginationControls'
import DashboardCard from '@/components/profile/DashboardCard'
import ProfileSection from '@/components/profile/ProfileSection'
import RefundEmptyState from '@/components/refunds/RefundEmptyState'
import RefundList from '@/components/refunds/RefundList'
import { REFUND_REQUEST_STATUSES, getRefundStatusLabel } from '@/types/refunds'
import { getCurrentUser } from '@/lib/session/getSession'
import { getProfileRefundsPageData } from '@/app/(protected)/profile/_lib/profile-refunds.data'

export default async function ProfileRefundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getProfileRefundsPageData(user, await searchParams)

  return (
    <ProfileSection
      eyebrow="Повернення"
      title="Мої повернення"
      description="Відстежуйте запити на повернення, їхній статус і фінальний результат обробки."
    >
      <DashboardCard
        title="Список повернень"
        description="Backend залишається єдиним джерелом правди для статусу, доступної суми та фінального результату."
      >
        <div className="space-y-5 p-5 sm:p-6">
          <form method="GET" className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-copy-secondary">
              <span>Статус</span>
              <select
                name="status"
                defaultValue={data.filters.status ?? ''}
                className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
              >
                <option value="">Усі</option>
                {REFUND_REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getRefundStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="ui-secondary-button">
              Застосувати
            </button>
          </form>

          {data.items.length === 0 ? (
            <RefundEmptyState
              title="Повернень поки що немає"
              description="Коли ви створите запит на повернення зі сторінки замовлення, він з’явиться тут."
              actionHref="/profile/orders"
              actionLabel="Перейти до замовлень"
            />
          ) : (
            <>
              <RefundList items={data.items} detailBasePath="/profile/refunds" />
              <PaginationControls
                pathname="/profile/refunds"
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
