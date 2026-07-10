import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import SearchInput from '@/components/admin/SearchInput'
import StatusFilter from '@/components/admin/StatusFilter'
import RiskAdvisoryNotice from '@/components/risk/RiskAdvisoryNotice'
import RiskProfileTable from '@/components/risk/RiskProfileTable'
import { getAdminUserRiskPageData } from '@/app/(protected)/admin/_lib/admin-risk.data'
import { getCurrentUser } from '@/lib/session/getSession'
import { RISK_LEVELS } from '@/types/risk'

export default async function AdminRiskUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminUserRiskPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Довіра та безпека"
      title="Профілі ризику користувачів"
      description="Переглядайте advisory-оцінки ризику для акаунтів маркетплейсу та відкривайте детальні хронології сигналів, коли щось потребує перевірки."
    >
      <RiskAdvisoryNotice />

      <AdminFilterBar action="/admin/risk/users">
        <SearchInput
          name="search"
          label="Пошук користувачів"
          defaultValue={data.filters.search}
          placeholder="Пошук за email або ім’ям"
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
        title="Черга ризиків користувачів"
        description="Оцінки ризику мають лише рекомендаційний характер і повинні розглядатися разом із контекстом скарг, суперечок і модерації."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="Профілів ризику користувачів не знайдено"
              description="Спробуйте інший пошуковий запит або рівень ризику, щоб побачити більше акаунтів."
            />
          </div>
        ) : (
          <RiskProfileTable items={data.items} entityType="USER" />
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/risk/users"
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
