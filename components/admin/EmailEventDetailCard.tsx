import EmailRetryButton from '@/components/admin/EmailRetryButton'
import EmailStatusBadge from '@/components/admin/EmailStatusBadge'
import type { AdminEmailEventDetail } from '@/types/admin-emails'

function formatDateTime(value: string | null) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('uk-UA')
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return 'Не вдалося відобразити JSON payload.'
  }
}

function formatDiagnosticError(value: string | null) {
  if (!value) {
    return '—'
  }

  return 'Провайдер повідомив про помилку доставки для цієї спроби.'
}

export default function EmailEventDetailCard({
  event,
}: {
  event: AdminEmailEventDetail
}) {
  return (
    <div className="space-y-6">
      <section className="ui-elevated-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-copy-strong">{event.eventType}</h2>
              <EmailStatusBadge status={event.status} />
            </div>
            <p className="break-all text-sm text-copy-secondary">{event.recipientEmail}</p>
            <p className="text-xs text-copy-muted">Dedupe key: {event.dedupeKey}</p>
          </div>

          <EmailRetryButton
            eventId={event.id}
            status={event.status}
            attempts={event.attempts}
            maxAttempts={event.maxAttempts}
          />
        </div>

        <dl className="mt-6 grid gap-4 text-sm text-copy-secondary md:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-copy-muted">Шаблон</dt>
            <dd className="mt-1 text-copy-primary">{event.template}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Спроби</dt>
            <dd className="mt-1 text-copy-primary">
              {event.attempts} / {event.maxAttempts}
            </dd>
          </div>
          <div>
            <dt className="text-copy-muted">Оброблено о</dt>
            <dd className="mt-1 text-copy-primary">{formatDateTime(event.processedAt)}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Наступна спроба</dt>
            <dd className="mt-1 text-copy-primary">{formatDateTime(event.nextAttemptAt)}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Створено</dt>
            <dd className="mt-1 text-copy-primary">{formatDateTime(event.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Помилка о</dt>
            <dd className="mt-1 text-copy-primary">{formatDateTime(event.failedAt)}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Користувач-отримувач</dt>
            <dd className="mt-1 text-copy-primary">{event.recipientUserId ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">ID події</dt>
            <dd className="mt-1 break-all text-copy-primary">{event.id}</dd>
          </div>
        </dl>
      </section>

      <section className="ui-elevated-panel p-5 sm:p-6">
        <h3 className="text-base font-semibold text-copy-strong">Дані payload</h3>
        <p className="mt-2 text-sm text-copy-muted">
          Збережені дані шаблону, що використовуються для рендерингу та ідемпотентних повторних спроб.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl border border-panelBorder bg-panel p-4 text-xs text-copy-secondary">
          <code>{formatJson(event.payload)}</code>
        </pre>
      </section>

      <section className="ui-elevated-panel overflow-hidden">
        <div className="border-b border-panelBorder px-5 py-5 sm:px-6">
          <h3 className="text-base font-semibold text-copy-strong">Історія логів доставки</h3>
          <p className="mt-1 text-sm text-copy-muted">
            Спроби на рівні провайдера, часові позначки та діагностика доставки.
          </p>
        </div>

        {event.logs.length === 0 ? (
          <div className="px-5 py-6 text-sm text-copy-muted sm:px-6">
            Для цієї події ще немає записів у логах провайдера.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-panel/60 text-left text-copy-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Провайдер</th>
                  <th className="px-5 py-3 font-medium">Статус</th>
                  <th className="px-5 py-3 font-medium">Тема</th>
                  <th className="px-5 py-3 font-medium">Надіслано</th>
                  <th className="px-5 py-3 font-medium">Доставлено</th>
                  <th className="px-5 py-3 font-medium">Остання активність</th>
                  <th className="px-5 py-3 font-medium">Помилка</th>
                </tr>
              </thead>
              <tbody>
                {event.logs.map((log) => (
                  <tr key={log.id} className="border-t border-panelBorder align-top">
                    <td className="px-5 py-4 text-copy-secondary">
                      <p>{log.provider}</p>
                      {log.providerMessageId ? (
                        <p className="mt-1 break-all text-xs text-copy-muted">{log.providerMessageId}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <EmailStatusBadge status={log.status} kind="delivery" />
                    </td>
                    <td className="px-5 py-4 text-copy-secondary">{log.subject}</td>
                    <td className="px-5 py-4 text-copy-secondary">{formatDateTime(log.sentAt)}</td>
                    <td className="px-5 py-4 text-copy-secondary">{formatDateTime(log.deliveredAt)}</td>
                    <td className="px-5 py-4 text-copy-secondary">
                      {formatDateTime(log.bouncedAt ?? log.updatedAt)}
                    </td>
                    <td className="px-5 py-4 text-copy-secondary">
                      {formatDiagnosticError(log.errorMessage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
