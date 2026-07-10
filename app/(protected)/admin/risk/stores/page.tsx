import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import SearchInput from '@/components/admin/SearchInput'
import StatusFilter from '@/components/admin/StatusFilter'
import RiskAdvisoryNotice from '@/components/risk/RiskAdvisoryNotice'
import RiskProfileTable from '@/components/risk/RiskProfileTable'
import { getAdminStoreRiskPageData } from '@/app/(protected)/admin/_lib/admin-risk.data'
import { getCurrentUser } from '@/lib/session/getSession'
import { RISK_LEVELS } from '@/types/risk'

export default async function AdminRiskStoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminStoreRiskPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Довіра та безпека"
      title="Профілі ризику магазинів"
      description="Переглядайте advisory-оцінки ризику для вітрин і заглиблюйтеся в історію сигналів, що стоять за кожним рівнем ризику."
    >
      <RiskAdvisoryNotice />

      <AdminFilterBar action="/admin/risk/stores">
        <SearchInput
          name="search"
          label="Пошук магазинів"
          defaultValue={data.filters.search}
          placeholder="Пошук за магазином або email власника"
        />
        <StatusFilter
          name="level"
          label="Рівень ризику"
          defaultValue={data.filters.level}
          options={RISK_LEVELS.map((level) => ({ label: level, value: level }))}
        />
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Застосувати фільтри</button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Черга ризиків магазинів"
        description="Використовуйте ці advisory-оцінки, щоб пріоритезувати ручний перегляд поведінки вітрин і сигналів довіри."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="Профілів ризику магазинів не знайдено"
              description="Спробуйте інший пошуковий запит або рівень ризику, щоб побачити більше вітрин."
            />
          </div>
        ) : (
          <RiskProfileTable items={data.items} entityType="STORE" />
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/risk/stores"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          search: data.filters.search,
          level: data.filters.level,
          limit: String(data.limit),
        }}
      />
    </AdminSection>
  )
}
