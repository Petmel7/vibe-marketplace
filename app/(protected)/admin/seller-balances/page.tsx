import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import SearchInput from '@/components/admin/SearchInput'
import AdminSellerBalancesTable from '@/components/finance/AdminSellerBalancesTable'
import RecalculateSellerBalancesButton from '@/components/finance/RecalculateSellerBalancesButton'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminSellerBalancesPageData } from '@/app/(protected)/admin/_lib/admin-payouts.data'

export default async function AdminSellerBalancesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminSellerBalancesPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Фінанси продавців"
      title="Баланси продавців"
      description="Переглядайте баланси в очікуванні, доступні та вже виплачені суми перед створенням ручних виплат."
    >
      <div className="ui-elevated-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-copy-strong">Перерахунок балансів</h2>
          <p className="text-sm text-copy-secondary">
            Використовуйте цей ручний запуск, коли утримані кошти вже мають стати доступними, а фоновий воркер ще не працює.
          </p>
        </div>
        <RecalculateSellerBalancesButton />
      </div>

      <AdminFilterBar action="/admin/seller-balances">
        <SearchInput
          name="sellerId"
          label="ID продавця"
          defaultValue={data.filters.sellerId}
          placeholder="Фільтр за UUID продавця"
        />
        <SearchInput
          name="storeId"
          label="ID магазину"
          defaultValue={data.filters.storeId}
          placeholder="Фільтр за UUID магазину"
        />
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Застосувати фільтри</button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Баланси продавців"
        description="Створюйте виплати лише для доступних балансів. Поточний бекенд очікує точні доступні партії в реєстрі."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="Балансів продавців не знайдено"
              description="Спробуйте інший фільтр продавця чи магазину або перерахунок балансів після появи релевантних замовлень."
            />
          </div>
        ) : (
          <AdminSellerBalancesTable items={data.items} />
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/seller-balances"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          sellerId: data.filters.sellerId,
          storeId: data.filters.storeId,
          limit: String(data.limit),
        }}
      />
    </AdminSection>
  )
}
