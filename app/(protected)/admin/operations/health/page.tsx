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
      eyebrow="Операції"
      title="Діагностика стану системи"
      description="Поточні сигнали стану застосунку, бази даних, конфігурації та готовності провайдерів із platform health-ендпоїнтів."
    >
      <OperationsShell currentPath="/admin/operations/health">
        <div className="flex justify-end">
          <RefreshPageButton label="Оновити стан системи" />
        </div>

        {data.status === 'error' ? (
          <AdminEmptyState
            title="Діагностика стану системи недоступна"
            description={data.errorMessage ?? 'Не вдалося завантажити діагностику стану системи.'}
          />
        ) : null}

        {data.status === 'ready' && data.snapshot ? (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <HealthStatusCard
                title="Стан застосунку"
                tone={getOperationsHealthTone(data.snapshot.deep.status)}
                label={data.snapshot.deep.status === 'ok' ? 'Справно' : 'Деградовано'}
                description={`Базовий стан: ${data.snapshot.basic.status}. Остання перевірка: ${new Date(data.snapshot.lastCheckedAt).toLocaleString('uk-UA')}.`}
                meta={
                  <dl className="grid gap-3 rounded-2xl bg-panel px-4 py-4 text-sm text-copy-secondary">
                    <div className="flex items-center justify-between">
                      <dt>Часова мітка</dt>
                      <dd>{new Date(data.snapshot.deep.timestamp).toLocaleString('uk-UA')}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Час роботи</dt>
                      <dd>{data.snapshot.deep.uptimeSeconds}s</dd>
                    </div>
                  </dl>
                }
              />
              <HealthStatusCard
                title="База даних"
                tone={data.snapshot.deep.database.ok ? 'success' : 'danger'}
                label={data.snapshot.deep.database.ok ? 'Підключено' : 'Недоступно'}
                description="Поглиблена перевірка стану системи перевіряє з’єднання з базою даних легким ping-запитом."
              />
              <HealthStatusCard
                title="Середовище"
                tone={data.snapshot.deep.env.ok ? 'success' : 'warning'}
                label={data.snapshot.deep.env.ok ? 'Коректне' : 'Знайдено проблеми'}
                description="Стан обов’язкових env-змінних і feature flags із централізованої валідації."
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
                    <p className="rounded-2xl bg-panel px-4 py-4 text-sm text-copy-secondary">Проблем із env-змінними не виявлено.</p>
                  )
                }
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
              <section className="ui-elevated-panel p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-copy-strong">Готовність провайдерів</h2>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Supabase / база даних</span>
                    <ProviderStatusBadge isReady={data.snapshot.deep.database.ok} readyLabel="Готово" missingLabel="Деградовано" />
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
                <h2 className="text-lg font-semibold text-copy-strong">Прапорці функцій</h2>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Email</span>
                    <ProviderStatusBadge isReady={data.snapshot.deep.featureFlags.emailEnabled} readyLabel="Увімкнено" missingLabel="Вимкнено" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Платежі</span>
                    <ProviderStatusBadge isReady={data.snapshot.deep.featureFlags.paymentsEnabled} readyLabel="Увімкнено" missingLabel="Вимкнено" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Доставка</span>
                    <ProviderStatusBadge isReady={data.snapshot.deep.featureFlags.shippingEnabled} readyLabel="Увімкнено" missingLabel="Вимкнено" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                    <span>Задачі</span>
                    <ProviderStatusBadge isReady={data.snapshot.deep.featureFlags.jobsEnabled} readyLabel="Увімкнено" missingLabel="Вимкнено" />
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
