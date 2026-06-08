import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminSection from '@/components/admin/AdminSection'
import HealthStatusCard from '@/components/operations/HealthStatusCard'
import OperationsShell from '@/components/operations/OperationsShell'
import ProviderStatusBadge from '@/components/operations/ProviderStatusBadge'
import RefreshPageButton from '@/components/operations/RefreshPageButton'
import { getAdminOperationsHealthPageData } from '@/app/(protected)/admin/_lib/admin-operations.data'
import { getCurrentUser } from '@/lib/session/getSession'
import { getOperationsHealthTone } from '@/types/operations'

export default async function AdminOperationsHealthPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminOperationsHealthPageData()

  return (
    <AdminSection
      eyebrow="Operations"
      title="Health diagnostics"
      description="Current app, database, config, and provider readiness signals from the platform health endpoints."
    >
      <OperationsShell currentPath="/admin/operations/health">
        <div className="flex justify-end">
          <RefreshPageButton label="Refresh health" />
        </div>

        {data.status === 'error' ? (
          <AdminEmptyState
            title="Health diagnostics unavailable"
            description={data.errorMessage ?? 'Не вдалося завантажити health diagnostics.'}
          />
        ) : null}

        {data.status === 'ready' && data.snapshot ? (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <HealthStatusCard
                title="App status"
                tone={getOperationsHealthTone(data.snapshot.deep.status)}
                label={data.snapshot.deep.status === 'ok' ? 'Healthy' : 'Degraded'}
                description={`Basic health is ${data.snapshot.basic.status}. Last checked ${new Date(data.snapshot.lastCheckedAt).toLocaleString('uk-UA')}.`}
                meta={
                  <dl className="grid gap-3 rounded-2xl bg-panel px-4 py-4 text-sm text-copy-secondary">
                    <div className="flex items-center justify-between">
                      <dt>Timestamp</dt>
                      <dd>{new Date(data.snapshot.deep.timestamp).toLocaleString('uk-UA')}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Uptime</dt>
                      <dd>{data.snapshot.deep.uptimeSeconds}s</dd>
                    </div>
                  </dl>
                }
              />
              <HealthStatusCard
                title="Database"
                tone={data.snapshot.deep.database.ok ? 'success' : 'danger'}
                label={data.snapshot.deep.database.ok ? 'Connected' : 'Unavailable'}
                description="Deep health checks database connectivity with a lightweight ping."
              />
              <HealthStatusCard
                title="Environment"
                tone={data.snapshot.deep.env.ok ? 'success' : 'warning'}
                label={data.snapshot.deep.env.ok ? 'Valid' : 'Issues found'}
                description="Required env and feature flag readiness from centralized validation."
                meta={
                  data.snapshot.deep.env.issues.length > 0 ? (
                    <ul className="space-y-2 rounded-2xl bg-panel px-4 py-4 text-sm text-copy-secondary">
                      {data.snapshot.deep.env.issues.map((issue) => (
                        <li key={`${issue.path}-${issue.message}`}>
                          <strong className="text-copy-strong">{issue.path}</strong>: {issue.message}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-2xl bg-panel px-4 py-4 text-sm text-copy-secondary">No env issues were reported.</p>
                  )
                }
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
              <section className="ui-elevated-panel p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-copy-strong">Provider readiness</h2>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Supabase / database</span>
                    <ProviderStatusBadge isReady={data.snapshot.deep.database.ok} readyLabel="Ready" missingLabel="Degraded" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Resend</span>
                    <ProviderStatusBadge isReady={data.snapshot.deep.providers.resendConfigured} />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>LiqPay</span>
                    <ProviderStatusBadge isReady={data.snapshot.deep.providers.liqpayConfigured} />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Nova Poshta</span>
                    <ProviderStatusBadge isReady={data.snapshot.deep.providers.novaPoshtaConfigured} />
                  </div>
                </div>
              </section>

              <section className="ui-elevated-panel p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-copy-strong">Feature flags</h2>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Email</span>
                    <ProviderStatusBadge isReady={data.snapshot.deep.featureFlags.emailEnabled} readyLabel="Enabled" missingLabel="Disabled" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Payments</span>
                    <ProviderStatusBadge isReady={data.snapshot.deep.featureFlags.paymentsEnabled} readyLabel="Enabled" missingLabel="Disabled" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Shipping</span>
                    <ProviderStatusBadge isReady={data.snapshot.deep.featureFlags.shippingEnabled} readyLabel="Enabled" missingLabel="Disabled" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Jobs</span>
                    <ProviderStatusBadge isReady={data.snapshot.deep.featureFlags.jobsEnabled} readyLabel="Enabled" missingLabel="Disabled" />
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : null}
      </OperationsShell>
    </AdminSection>
  )
}
