import Link from 'next/link'
import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import StatusFilter from '@/components/admin/StatusFilter'
import CommissionPreviewCard from '@/components/commissions/CommissionPreviewCard'
import CommissionRuleTable from '@/components/commissions/CommissionRuleTable'
import { getAdminCommissionRulesPageData } from '@/app/(protected)/admin/_lib/admin-commission-rules.data'
import { getCurrentUser } from '@/lib/session/getSession'
import { COMMISSION_RULE_SCOPES, getCommissionRuleScopeLabel } from '@/types/commissions'

const COMMISSION_ACTIVE_FILTERS = [
  { label: 'Active only', value: 'true' },
  { label: 'Disabled only', value: 'false' },
] as const

export default async function AdminCommissionRulesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const data = await getAdminCommissionRulesPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Finance"
      title="Commission rules"
      description="Manage global, category, and store-specific commission rates while keeping historical platform commission snapshots immutable."
    >
      <AdminFilterBar action="/admin/commission-rules">
        <StatusFilter
          name="scope"
          label="Scope"
          defaultValue={data.filters.scope}
          options={COMMISSION_RULE_SCOPES.map((scope) => ({
            label: getCommissionRuleScopeLabel(scope),
            value: scope,
          }))}
        />
        <StatusFilter
          name="isActive"
          label="Availability"
          defaultValue={
            typeof data.filters.isActive === 'boolean' ? String(data.filters.isActive) : undefined
          }
          options={[...COMMISSION_ACTIVE_FILTERS]}
        />
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Apply filters</button>
          <Link href="/admin/commission-rules/new" className="ui-secondary-button">
            New rule
          </Link>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Commission rule catalog"
        description="Priorities are evaluated first; when priorities match, store rules beat category rules, and category rules beat the global fallback."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No commission rules found"
              description="Create a global fallback or a more specific override to make commission policy transparent and auditable."
            />
          </div>
        ) : (
          <CommissionRuleTable items={data.items} />
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/commission-rules"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          scope: data.filters.scope,
          isActive:
            typeof data.filters.isActive === 'boolean' ? String(data.filters.isActive) : undefined,
          limit: String(data.limit),
        }}
      />

      <CommissionPreviewCard stores={data.stores} categories={data.categories} />
    </AdminSection>
  )
}
