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
      eyebrow="Trust & Safety"
      title="Store risk profiles"
      description="Inspect advisory risk scores for storefronts and drill into the signal history behind each risk level."
    >
      <RiskAdvisoryNotice />

      <AdminFilterBar action="/admin/risk/stores">
        <SearchInput
          name="search"
          label="Search stores"
          defaultValue={data.filters.search}
          placeholder="Search by store or owner email"
        />
        <StatusFilter
          name="level"
          label="Risk level"
          defaultValue={data.filters.level}
          options={RISK_LEVELS.map((level) => ({ label: level, value: level }))}
        />
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Apply filters</button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Store risk queue"
        description="Use these advisory scores to prioritize manual review of storefront behavior and trust signals."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No store risk profiles found"
              description="Try a different search term or risk level to surface more storefronts."
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
