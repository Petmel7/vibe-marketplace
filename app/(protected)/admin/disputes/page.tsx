import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import AdminDisputesTable from '@/components/disputes/AdminDisputesTable'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminDisputesPageData } from '@/app/(protected)/admin/_lib/admin-disputes.data'

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminDisputesPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Суперечки"
      title="Черга суперечок"
      description="Контролюйте суперечки по замовленнях, фільтруйте чергу та відкривайте детальні сценарії вирішення."
    >
      <AdminDataTable
        title="Суперечки маркетплейсу"
        description="Фільтруйте суперечки за статусом, причиною, пріоритетом і датою створення."
        stackActionsOnTablet
        actions={
          <form method="GET" className="w-full xl:w-[min(100%,52rem)]">
            <div className="space-y-3">
              <div className="grid gap-3 min-[501px]:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2 text-sm text-copy-secondary">
                  <span className="block font-medium text-copy-strong">Статус</span>
                  <select
                    name="status"
                    defaultValue={data.filters.status ?? ''}
                    className="ui-native-select w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
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
                <label className="space-y-2 text-sm text-copy-secondary">
                  <span className="block font-medium text-copy-strong">Причина</span>
                  <select
                    name="reason"
                    defaultValue={data.filters.reason ?? ''}
                    className="ui-native-select w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                  >
                    <option value="">Усі</option>
                    <option value="ITEM_NOT_RECEIVED">Товар не отримано</option>
                    <option value="ITEM_NOT_AS_DESCRIBED">Товар не відповідає опису</option>
                    <option value="DAMAGED_ITEM">Пошкоджений товар</option>
                    <option value="WRONG_ITEM">Неправильний товар</option>
                    <option value="PAYMENT_ISSUE">Проблема з оплатою</option>
                    <option value="REFUND_REQUEST">Запит на повернення</option>
                    <option value="SELLER_ISSUE">Проблема з боку продавця</option>
                    <option value="BUYER_ISSUE">Проблема з боку покупця</option>
                    <option value="OTHER">Інше</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-copy-secondary min-[501px]:col-span-2 xl:col-span-1">
                  <span className="block font-medium text-copy-strong">Пріоритет</span>
                  <select
                    name="priority"
                    defaultValue={data.filters.priority ?? ''}
                    className="ui-native-select w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                  >
                    <option value="">Усі</option>
                    <option value="LOW">Низький</option>
                    <option value="NORMAL">Звичайний</option>
                    <option value="HIGH">Високий</option>
                    <option value="URGENT">Терміновий</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 min-[501px]:grid-cols-2">
                <label className="space-y-2 text-sm text-copy-secondary">
                  <span className="block font-medium text-copy-strong">Від</span>
                  <input
                    type="date"
                    name="dateFrom"
                    defaultValue={data.filters.dateFrom?.slice(0, 10) ?? ''}
                    className="w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                  />
                </label>
                <label className="space-y-2 text-sm text-copy-secondary">
                  <span className="block font-medium text-copy-strong">До</span>
                  <input
                    type="date"
                    name="dateTo"
                    defaultValue={data.filters.dateTo?.slice(0, 10) ?? ''}
                    className="w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                  />
                </label>
              </div>

              <div className="flex justify-center max-[500px]:block max-[500px]:[&>*]:w-full">
                <button type="submit" className="ui-secondary-button">
                  Застосувати
                </button>
              </div>
            </div>
          </form>
        }
      >
        <div className="space-y-5 p-5 sm:p-6">
          {data.items.length === 0 ? (
            <AdminEmptyState
              title="Суперечок не знайдено"
              description="Тут з’являться суперечки, що відповідають поточним фільтрам."
            />
          ) : (
            <>
              <AdminDisputesTable disputes={data.items} />
              <PaginationControls
                pathname="/admin/disputes"
                page={data.page}
                limit={data.limit}
                total={data.total}
                query={{
                  status: data.filters.status,
                  reason: data.filters.reason,
                  priority: data.filters.priority,
                  dateFrom: data.filters.dateFrom?.slice(0, 10),
                  dateTo: data.filters.dateTo?.slice(0, 10),
                }}
              />
            </>
          )}
        </div>
      </AdminDataTable>
    </AdminSection>
  )
}
