import Link from 'next/link'
import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminSection from '@/components/admin/AdminSection'
import OperationsMetricCard from '@/components/operations/OperationsMetricCard'
import OperationsShell from '@/components/operations/OperationsShell'
import ProviderStatusBadge from '@/components/operations/ProviderStatusBadge'
import { getAdminOperationsOverviewPageData } from '@/app/(protected)/admin/_lib/admin-operations.data'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminAuditActorLabel } from '@/types/operations'
import { logInfo } from '@/utils/logger'

async function renderAdminOperationsOverviewPage() {
  const user = await getCurrentUser()
  logInfo('admin-operations-page:after-get-current-user', {
    domain: 'admin-operations',
    route: '/admin/operations',
    hasUser: Boolean(user),
    userId: user?.id ?? null,
  })
  if (!user) return null

  logInfo('admin-operations-page:before-overview-data', {
    domain: 'admin-operations',
    route: '/admin/operations',
    userId: user.id,
  })
  const data = await getAdminOperationsOverviewPageData(user)
  logInfo('admin-operations-page:after-overview-data', {
    domain: 'admin-operations',
    route: '/admin/operations',
    userId: user.id,
    hasHealth: Boolean(data.health),
    hasJobsOverview: Boolean(data.jobsOverview),
    auditItemCount: data.recentAuditLogs?.items.length ?? 0,
  })

  const healthTone =
    !data.health ? 'Проблема' : data.health.deep.status === 'ok' ? 'Справно' : 'Деградовано'

  logInfo('admin-operations-page:before-render-tree', {
    domain: 'admin-operations',
    route: '/admin/operations',
    userId: user.id,
    healthTone,
    providerIssueCount: data.providerIssues.length,
  })

  const tree = (
    <AdminSection
      eyebrow="Операції"
      title="Спостереження й аудит"
      description="Операційний стан, фонові задачі та аудит дій адміністраторів для безпечнішої підтримки продакшену й діагностики."
    >
      <OperationsShell currentPath="/admin/operations">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <OperationsMetricCard
            label="Стан"
            value={healthTone}
            detail={
              data.health
                ? `Остання перевірка: ${new Date(data.health.lastCheckedAt).toLocaleString('uk-UA')}`
                : 'Health-ендпоїнти зараз недоступні.'
            }
            href="/admin/operations/health"
          />
          <OperationsMetricCard
            label="Помилкові задачі"
            value={data.jobsOverview?.failedTotal ?? '—'}
            detail="Фонові задачі, які можна повторити й які потребують уваги."
            href="/admin/operations/jobs?status=FAILED"
          />
          <OperationsMetricCard
            label="Задачі в черзі"
            value={data.jobsOverview?.pendingTotal ?? '—'}
            detail="Робота в черзі, яка очікує запуску job runner."
            href="/admin/operations/jobs?status=PENDING"
          />
          <OperationsMetricCard
            label="Останні дії адміністратора"
            value={data.recentAuditLogs?.items.length ?? '—'}
            detail="Останні записи аудиту з чутливих адміністративних сценаріїв."
            href="/admin/operations/audit-logs"
          />
          <OperationsMetricCard
            label="Проблеми провайдерів"
            value={data.providerIssues.length}
            detail="Проблеми конфігурації або готовності, виявлені поглибленою health-перевіркою."
            href="/admin/operations/health"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <AdminDataTable
            title="Остання активність аудиту"
            description="Найновіші чутливі адміністративні зміни, зафіксовані шаром аудиту."
            actions={
              <Link href="/admin/operations/audit-logs" className="ui-link-muted">
                Відкрити журнал аудиту
              </Link>
            }
          >
            {data.auditError ? (
              <div className="p-6">
                <AdminEmptyState
                  title="Активність аудиту тимчасово недоступна"
                  description="Дані health і jobs завантажилися успішно, але панель останньої аудиторської активності зараз не вдалося відкрити."
                />
              </div>
            ) : !data.recentAuditLogs || data.recentAuditLogs.items.length === 0 ? (
              <div className="p-6">
                <AdminEmptyState
                  title="Немає нещодавньої активності аудиту"
                  description="Чутливі адміністративні дії з’являться тут, щойно потік аудиту отримає записи."
                />
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-panel/60 text-left text-copy-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Виконавець</th>
                    <th className="px-5 py-3 font-medium">Дія</th>
                    <th className="px-5 py-3 font-medium">Ресурс</th>
                    <th className="px-5 py-3 font-medium">Час</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentAuditLogs.items.map((item) => (
                    <tr key={item.id} className="border-t border-panelBorder align-top">
                      <td className="px-5 py-4 text-copy-secondary">
                        {getAdminAuditActorLabel(item)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-copy-strong">{item.action}</p>
                        <p className="mt-1 text-xs text-copy-muted">{item.domain}</p>
                      </td>
                      <td className="px-5 py-4 text-copy-secondary">
                        {item.resourceType}
                        <p className="mt-1 text-xs text-copy-muted">{item.resourceId ?? '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-copy-secondary">
                        {new Date(item.createdAt).toLocaleString('uk-UA')}
                      </td>
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
                  <h2 className="text-lg font-semibold text-copy-strong">Готовність провайдерів</h2>
                  <p className="mt-1 text-sm text-copy-muted">
                    Швидкий сигнал щодо зовнішніх сервісів, які забезпечують email, платежі та доставку.
                  </p>
                </div>
                <Link href="/admin/operations/health" className="ui-link-muted">
                  Відкрити стан системи
                </Link>
              </div>

              {data.health ? (
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Supabase / база даних</span>
                    <ProviderStatusBadge
                      isReady={data.health.deep.database.ok}
                      readyLabel="Готово"
                      missingLabel="Деградовано"
                    />
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
                <p className="mt-5 text-sm text-copy-muted">
                  Дані health зараз недоступні.
                </p>
              )}
            </section>

            <section className="ui-elevated-panel p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-copy-strong">Останні проблеми провайдерів</h2>
              {data.providerIssues.length === 0 ? (
                <p className="mt-4 text-sm text-copy-muted">
                  Остання поглиблена health-перевірка не виявила проблем готовності провайдерів.
                </p>
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

  logInfo('admin-operations-page:after-render-tree', {
    domain: 'admin-operations',
    route: '/admin/operations',
    userId: user.id,
    healthTone,
    providerIssueCount: data.providerIssues.length,
  })

  return tree
}

export default async function AdminOperationsOverviewPage() {
  logInfo('admin-operations-page:start', {
    domain: 'admin-operations',
    route: '/admin/operations',
  })

  const page = await renderAdminOperationsOverviewPage()

  logInfo('admin-operations-page:after-page-resolve', {
    domain: 'admin-operations',
    route: '/admin/operations',
    resolved: true,
  })

  return page
}
