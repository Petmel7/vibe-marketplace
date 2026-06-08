import Link from 'next/link'
import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminSection from '@/components/admin/AdminSection'
import OperationsMetricCard from '@/components/operations/OperationsMetricCard'
import OperationsShell from '@/components/operations/OperationsShell'
import ProviderStatusBadge from '@/components/operations/ProviderStatusBadge'
import { getAdminOperationsOverviewPageData } from '@/app/(protected)/admin/_lib/admin-operations.data'
import { getCurrentUser } from '@/lib/session/getSession'

export default async function AdminOperationsOverviewPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminOperationsOverviewPageData()

  const healthTone =
    !data.health ? 'Unhealthy' : data.health.deep.status === 'ok' ? 'Healthy' : 'Degraded'

  return (
    <AdminSection
      eyebrow="Operations"
      title="Observability & audit"
      description="Operational health, background jobs, and admin audit trails for production support and safer debugging."
    >
      <OperationsShell currentPath="/admin/operations">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <OperationsMetricCard
            label="Health"
            value={healthTone}
            detail={
              data.health
                ? `Last checked ${new Date(data.health.lastCheckedAt).toLocaleString('uk-UA')}`
                : 'Health endpoints are currently unavailable.'
            }
            href="/admin/operations/health"
          />
          <OperationsMetricCard
            label="Failed jobs"
            value={data.failedJobs?.total ?? '—'}
            detail="Retryable background jobs that need attention."
            href="/admin/operations/jobs?status=FAILED"
          />
          <OperationsMetricCard
            label="Pending jobs"
            value={data.pendingJobs?.total ?? '—'}
            detail="Queued work waiting for the job runner."
            href="/admin/operations/jobs?status=PENDING"
          />
          <OperationsMetricCard
            label="Recent admin actions"
            value={data.recentAuditLogs?.items.length ?? '—'}
            detail="Latest audit trail entries from sensitive admin flows."
            href="/admin/operations/audit-logs"
          />
          <OperationsMetricCard
            label="Provider issues"
            value={data.providerIssues.length}
            detail="Config/readiness concerns surfaced by deep health checks."
            href="/admin/operations/health"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <AdminDataTable
            title="Recent audit activity"
            description="The newest admin-sensitive mutations recorded by the audit layer."
            actions={<Link href="/admin/operations/audit-logs" className="ui-link-muted">Open audit logs</Link>}
          >
            {!data.recentAuditLogs || data.recentAuditLogs.items.length === 0 ? (
              <div className="p-6">
                <AdminEmptyState
                  title="No recent audit activity"
                  description="Sensitive admin actions will appear here once the audit stream has entries."
                />
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-panel/60 text-left text-copy-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Actor</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                    <th className="px-5 py-3 font-medium">Resource</th>
                    <th className="px-5 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentAuditLogs.items.map((item) => (
                    <tr key={item.id} className="border-t border-panelBorder align-top">
                      <td className="px-5 py-4 text-copy-secondary">{item.actorEmail ?? item.actorId}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-copy-strong">{item.action}</p>
                        <p className="mt-1 text-xs text-copy-muted">{item.domain}</p>
                      </td>
                      <td className="px-5 py-4 text-copy-secondary">
                        {item.resourceType}
                        <p className="mt-1 text-xs text-copy-muted">{item.resourceId ?? '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-copy-secondary">{new Date(item.createdAt).toLocaleString('uk-UA')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </AdminDataTable>

          <div className="space-y-6">
            <section className="ui-elevated-panel p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-copy-strong">Provider readiness</h2>
                  <p className="mt-1 text-sm text-copy-muted">
                    Quick signal of the external services that power email, payments, and shipping.
                  </p>
                </div>
                <Link href="/admin/operations/health" className="ui-link-muted">
                  Open health
                </Link>
              </div>

              {data.health ? (
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Supabase / database</span>
                    <ProviderStatusBadge isReady={data.health.deep.database.ok} readyLabel="Ready" missingLabel="Degraded" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Resend</span>
                    <ProviderStatusBadge isReady={data.health.deep.providers.resendConfigured} />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>LiqPay</span>
                    <ProviderStatusBadge isReady={data.health.deep.providers.liqpayConfigured} />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Nova Poshta</span>
                    <ProviderStatusBadge isReady={data.health.deep.providers.novaPoshtaConfigured} />
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm text-copy-muted">Health data is currently unavailable.</p>
              )}
            </section>

            <section className="ui-elevated-panel p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-copy-strong">Recent provider issues</h2>
              {data.providerIssues.length === 0 ? (
                <p className="mt-4 text-sm text-copy-muted">No provider readiness issues surfaced by the latest deep health check.</p>
              ) : (
                <ul className="mt-4 space-y-3 text-sm text-copy-secondary">
                  {data.providerIssues.map((issue) => (
                    <li key={issue} className="rounded-2xl bg-panel px-4 py-3">
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </OperationsShell>
    </AdminSection>
  )
}
