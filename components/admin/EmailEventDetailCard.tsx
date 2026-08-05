import EmailRetryButton from '@/components/admin/EmailRetryButton'
import EmailStatusBadge from '@/components/admin/EmailStatusBadge'
import SectionStack from '@/components/layout/SectionStack'
import Panel from '@/components/ui/panel/Panel'
import {
  DataTable,
  TableCell,
  TableDateCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableStatusCell,
} from '@/components/ui/table'
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
    <SectionStack>
      <Panel>
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
      </Panel>

      <Panel>
        <h3 className="text-base font-semibold text-copy-strong">Дані payload</h3>
        <p className="mt-2 text-sm text-copy-muted">
          Збережені дані шаблону, що використовуються для рендерингу та ідемпотентних повторних спроб.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl border border-panelBorder bg-panel p-4 text-xs text-copy-secondary">
          <code>{formatJson(event.payload)}</code>
        </pre>
      </Panel>

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
            <DataTable>
              <TableHead>
                <tr>
                  <TableHeaderCell>Провайдер</TableHeaderCell>
                  <TableHeaderCell>Статус</TableHeaderCell>
                  <TableHeaderCell>Тема</TableHeaderCell>
                  <TableHeaderCell>Надіслано</TableHeaderCell>
                  <TableHeaderCell>Доставлено</TableHeaderCell>
                  <TableHeaderCell>Остання активність</TableHeaderCell>
                  <TableHeaderCell>Помилка</TableHeaderCell>
                </tr>
              </TableHead>
              <tbody>
                {event.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell tone="secondary">
                      <p>{log.provider}</p>
                      {log.providerMessageId ? (
                        <p className="mt-1 break-all text-xs text-copy-muted">{log.providerMessageId}</p>
                      ) : null}
                    </TableCell>
                    <TableStatusCell>
                      <EmailStatusBadge status={log.status} kind="delivery" />
                    </TableStatusCell>
                    <TableCell tone="secondary">{log.subject}</TableCell>
                    <TableDateCell value={log.sentAt} />
                    <TableDateCell value={log.deliveredAt} />
                    <TableDateCell value={log.bouncedAt ?? log.updatedAt} />
                    <TableCell tone="secondary">
                      {formatDiagnosticError(log.errorMessage)}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTable>
          </div>
        )}
      </section>
    </SectionStack>
  )
}
