import Link from 'next/link'
import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminMetricCard from '@/components/admin/AdminMetricCard'
import AdminSection from '@/components/admin/AdminSection'
import RiskAdvisoryNotice from '@/components/risk/RiskAdvisoryNotice'
import RiskProfileTable from '@/components/risk/RiskProfileTable'
import RiskRecalculateButton from '@/components/risk/RiskRecalculateButton'
import { getAdminRiskOverviewData } from '@/app/(protected)/admin/_lib/admin-risk.data'
import { getCurrentUser } from '@/lib/session/getSession'

export default async function AdminRiskOverviewPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminRiskOverviewData(user)

  return (
    <AdminSection
      eyebrow="Trust & Safety"
      title="Risk scoring"
      description="Review advisory risk profiles for users and stores, inspect recent signals, and manually refresh scoring when moderation events land."
    >
      <RiskAdvisoryNotice />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Critical users"
          value={data.criticalUsers.total}
          detail="Accounts currently at the highest advisory risk level"
        />
        <AdminMetricCard
          label="Critical stores"
          value={data.criticalStores.total}
          detail="Storefronts currently requiring the fastest trust review"
        />
        <AdminMetricCard
          label="Recent user profiles"
          value={data.recentUsers.total}
          detail="Tracked user risk profiles available to review"
        />
        <AdminMetricCard
          label="Recent store profiles"
          value={data.recentStores.total}
          detail="Tracked store risk profiles available to review"
        />
      </div>

      <div className="ui-elevated-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-copy-strong">Manual recalculation</h2>
          <p className="text-sm text-copy-secondary">
            Rebuild the advisory scores from stored signals when you need a fresh operational snapshot.
          </p>
        </div>
        <RiskRecalculateButton targetType="ALL" label="Recalculate all risk profiles" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminDataTable
          title="Critical user profiles"
          description="Accounts with the most urgent trust and safety signal mix."
          actions={<Link href="/admin/risk/users?level=CRITICAL" className="ui-link-muted">Open users</Link>}
        >
          {data.criticalUsers.items.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="No critical user profiles"
                description="Critical user risk profiles will appear here when the signal threshold is crossed."
              />
            </div>
          ) : (
            <RiskProfileTable items={data.criticalUsers.items} entityType="USER" />
          )}
        </AdminDataTable>

        <AdminDataTable
          title="Critical store profiles"
          description="Storefronts whose risk signal load needs admin review."
          actions={<Link href="/admin/risk/stores?level=CRITICAL" className="ui-link-muted">Open stores</Link>}
        >
          {data.criticalStores.items.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="No critical store profiles"
                description="Critical store risk profiles will appear here when the signal threshold is crossed."
              />
            </div>
          ) : (
            <RiskProfileTable items={data.criticalStores.items} entityType="STORE" />
          )}
        </AdminDataTable>
      </div>
    </AdminSection>
  )
}
