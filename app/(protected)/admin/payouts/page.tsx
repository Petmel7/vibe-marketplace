import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import SearchInput from '@/components/admin/SearchInput'
import StatusFilter from '@/components/admin/StatusFilter'
import AdminPayoutsTable from '@/components/finance/AdminPayoutsTable'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminPayoutsPageData } from '@/app/(protected)/admin/_lib/admin-payouts.data'
import { PAYOUT_STATUSES, getPayoutStatusLabel } from '@/types/payouts'

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminPayoutsPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Фінанси продавців"
      title="Ручні виплати"
      description="Переглядайте пакети виплат, перевіряйте їхній стан і оновлюйте статус життєвого циклу без розкриття деталей розрахунків на стороні провайдера."
    >
      <AdminFilterBar action="/admin/payouts">
        <div className="flex w-full flex-col items-center gap-3 max-[500px]:items-stretch">
          <div className="grid w-full gap-3 max-[500px]:max-w-none min-[501px]:grid-cols-2 min-[1146px]:grid-cols-3">
            <div>
              <StatusFilter
                name="status"
                label="Статус"
                defaultValue={data.filters.status}
                options={PAYOUT_STATUSES.map((status) => ({ label: getPayoutStatusLabel(status), value: status }))}
              />
            </div>
            <div>
              <SearchInput
                name="sellerId"
                label="ID продавця"
                defaultValue={data.filters.sellerId}
                placeholder="Фільтр за UUID продавця"
              />
            </div>
            <div className="min-[501px]:col-span-2 min-[1146px]:col-span-1">
              <SearchInput
                name="storeId"
                label="ID магазину"
                defaultValue={data.filters.storeId}
                placeholder="Фільтр за UUID магазину"
              />
            </div>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Дата від</span>
              <input
                type="date"
                name="dateFrom"
                defaultValue={data.filters.dateFrom ? data.filters.dateFrom.slice(0, 10) : ''}
                className="ui-surface-input w-full"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Дата до</span>
              <input
                type="date"
                name="dateTo"
                defaultValue={data.filters.dateTo ? data.filters.dateTo.slice(0, 10) : ''}
                className="ui-surface-input w-full"
              />
            </label>
          </div>
          <div className="flex justify-center max-[500px]:block max-[500px]:[&>*]:w-full">
            <button type="submit" className="ui-primary-button">Застосувати фільтри</button>
          </div>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Черга виплат"
        description="Використовуйте деталі виплат, щоб підтвердити включені записи бухгалтерії та обережно змінювати фінансові статуси."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="Виплат не знайдено"
              description="Створіть виплату з балансів продавців або розширте поточні фільтри."
              actionHref="/admin/seller-balances"
              actionLabel="Відкрити баланси продавців"
            />
          </div>
        ) : (
          <AdminPayoutsTable items={data.items} />
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/payouts"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          status: data.filters.status,
          sellerId: data.filters.sellerId,
          storeId: data.filters.storeId,
          dateFrom: data.filters.dateFrom,
          dateTo: data.filters.dateTo,
          limit: String(data.limit),
        }}
      />
    </AdminSection>
  )
}
