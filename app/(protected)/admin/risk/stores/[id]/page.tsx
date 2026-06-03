import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import StatusFilter from '@/components/admin/StatusFilter'
import RiskAdvisoryNotice from '@/components/risk/RiskAdvisoryNotice'
import RiskProfileSummaryCard from '@/components/risk/RiskProfileSummaryCard'
import RiskRecalculateButton from '@/components/risk/RiskRecalculateButton'
import RiskSignalTimeline from '@/components/risk/RiskSignalTimeline'
import {
  filterRiskSignals,
  getAdminStoreRiskDetailPageData,
  parseRiskDetailFilters,
} from '@/app/(protected)/admin/_lib/admin-risk.data'
import { getCurrentUser } from '@/lib/session/getSession'
import { RISK_SIGNAL_TYPES } from '@/types/risk'

export default async function AdminRiskStoreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params
  const profile = await getAdminStoreRiskDetailPageData(user, id)

  if (!profile) {
    notFound()
  }

  const filters = parseRiskDetailFilters(await searchParams)
  const filteredSignals = filterRiskSignals(profile, filters)

  return (
    <AdminSection
      eyebrow="Trust & Safety"
      title="Store risk detail"
      description="Inspect the advisory signal timeline for this storefront and jump into related trust workflows."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/risk/stores" className="ui-link-muted">
          Back to store risk profiles
        </Link>
        <RiskRecalculateButton targetType="STORE" targetId={id} label="Recalculate this store" />
      </div>

      <RiskAdvisoryNotice />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <RiskProfileSummaryCard profile={profile} entityType="STORE" />

          <section className="ui-elevated-panel p-5 sm:p-6">
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-copy-strong">Recent signals</h2>
                <p className="mt-1 text-sm text-copy-secondary">
                  Filter the timeline to review disputes, reports, refunds, and moderation actions tied to this storefront.
                </p>
              </div>

              <AdminFilterBar action={`/admin/risk/stores/${id}`}>
                <StatusFilter
                  name="signalType"
                  label="Signal type"
                  defaultValue={filters.signalType}
                  options={RISK_SIGNAL_TYPES.map((signalType) => ({ label: signalType, value: signalType }))}
                />
                <label className="space-y-2 xl:w-56">
                  <span className="block text-sm font-medium text-copy-strong">From date</span>
                  <input type="date" name="dateFrom" defaultValue={filters.dateFrom} className="ui-surface-input" />
                </label>
                <label className="space-y-2 xl:w-56">
                  <span className="block text-sm font-medium text-copy-strong">To date</span>
                  <input type="date" name="dateTo" defaultValue={filters.dateTo} className="ui-surface-input" />
                </label>
                <div className="flex gap-2 xl:self-end">
                  <button type="submit" className="ui-primary-button">Apply filters</button>
                </div>
              </AdminFilterBar>

              <RiskSignalTimeline signals={filteredSignals} profile={profile} />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="ui-elevated-panel p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-copy-strong">Related admin surfaces</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Link href="/admin/sellers" className="ui-link-muted">
                Open seller workspace
              </Link>
              <Link href="/admin/reports" className="ui-link-muted">
                Review abuse reports
              </Link>
              <Link href="/admin/disputes" className="ui-link-muted">
                Review disputes
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </AdminSection>
  )
}
