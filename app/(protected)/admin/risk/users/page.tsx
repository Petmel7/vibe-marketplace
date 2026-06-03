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
      eyebrow="Trust & Safety"
      title="User risk profiles"
      description="Inspect advisory risk scores for marketplace accounts and open detailed signal timelines when something needs review."
    >
      <RiskAdvisoryNotice />

      <AdminFilterBar action="/admin/risk/users">
        <SearchInput
          name="search"
          label="Search users"
          defaultValue={data.filters.search}
          placeholder="Search by email or name"
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
        title="User risk queue"
        description="Risk scoring is advisory only and should be combined with report, dispute, and moderation context."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No user risk profiles found"
              description="Try a different search term or risk level to surface more accounts."
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
