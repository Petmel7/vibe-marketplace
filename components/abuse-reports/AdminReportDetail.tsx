import AbuseReportStatusBadge from './AbuseReportStatusBadge'
import AbuseReportActionDialog from './AbuseReportActionDialog'
import AdminEvidenceViewer from './AdminEvidenceViewer'
import ReportTargetPreview from './ReportTargetPreview'
import type { ReportDetail } from '@/types/abuse-reports'

function getReasonLabel(reason: ReportDetail['reason']) {
  switch (reason) {
    case 'SPAM':
      return 'Спам'
    case 'SCAM':
      return 'Шахрайство'
    case 'COUNTERFEIT':
      return 'Підробка'
    case 'PROHIBITED_ITEM':
      return 'Заборонений товар'
    case 'INAPPROPRIATE_CONTENT':
      return 'Неприйнятний контент'
    case 'HARASSMENT':
      return 'Домагання або образи'
    case 'MISLEADING_INFO':
      return 'Оманлива інформація'
    case 'PAYMENT_ISSUE':
      return 'Проблема з оплатою'
    case 'DELIVERY_ISSUE':
      return 'Проблема з доставкою'
    case 'OTHER':
      return 'Інше'
  }
}

function getActionLabel(actionType: ReportDetail['actions'][number]['actionType']) {
  switch (actionType) {
    case 'NO_ACTION':
      return 'Без додаткових дій'
    case 'WARN_USER':
      return 'Попередження користувача'
    case 'HIDE_REVIEW':
      return 'Приховати відгук'
    case 'REJECT_PRODUCT':
      return 'Відхилити товар'
    case 'ARCHIVE_PRODUCT':
      return 'Архівувати товар'
    case 'SUSPEND_SELLER':
      return 'Призупинити продавця'
    case 'SUSPEND_STORE':
      return 'Призупинити магазин'
    case 'ESCALATE':
      return 'Ескалювати'
  }
}

export default function AdminReportDetail({ report }: { report: ReportDetail }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="ui-elevated-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <ReportTargetPreview preview={report.targetPreview} />
              <p className="text-sm text-copy-secondary">Причина: {getReasonLabel(report.reason)}</p>
            </div>
            <AbuseReportStatusBadge status={report.status} />
          </div>

          {report.description ? (
            <div className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-copy-muted">Опис</p>
              <p className="mt-2 text-sm leading-6 text-copy-primary">{report.description}</p>
            </div>
          ) : null}

          <dl className="grid gap-3 text-sm text-copy-secondary sm:grid-cols-2">
            <div>
              <dt className="text-copy-muted">Заявник</dt>
              <dd className="mt-1 text-copy-primary">{report.reporter.name}</dd>
            </div>
            <div>
              <dt className="text-copy-muted">Email</dt>
              <dd className="mt-1 text-copy-primary">{report.reporter.emailMasked}</dd>
            </div>
            <div>
              <dt className="text-copy-muted">Створено</dt>
              <dd className="mt-1 text-copy-primary">{new Date(report.createdAt).toLocaleString('uk-UA')}</dd>
            </div>
            <div>
              <dt className="text-copy-muted">Оновлено</dt>
              <dd className="mt-1 text-copy-primary">{new Date(report.updatedAt).toLocaleString('uk-UA')}</dd>
            </div>
          </dl>

          {report.resolutionNote ? (
            <div className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-copy-muted">
                Нотатка по рішенню
              </p>
              <p className="mt-2 text-sm leading-6 text-copy-primary">{report.resolutionNote}</p>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="space-y-6">
        <AdminEvidenceViewer reportId={report.id} />

        <section className="ui-elevated-panel p-5 sm:p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-copy-strong">Статус скарги</h2>
            <div className="flex flex-wrap gap-3">
              <AbuseReportActionDialog
                kind="status"
                endpointId={report.id}
                status="UNDER_REVIEW"
                triggerLabel="Взяти в роботу"
                title="Позначити як “На розгляді”"
                description="Скарга перейде в активну роботу й стане видимою як така, що вже в обробці."
                successMessage="Скаргу позначено як таку, що в роботі."
              />
              <AbuseReportActionDialog
                kind="status"
                endpointId={report.id}
                status="RESOLVED"
                triggerLabel="Вирішити"
                title="Позначити скаргу як вирішену"
                description="Користувач отримає оновлення про завершення перевірки."
                successMessage="Скаргу вирішено."
                requireNote
                noteLabel="Пояснення для користувача"
                tone="success"
              />
              <AbuseReportActionDialog
                kind="status"
                endpointId={report.id}
                status="DISMISSED"
                triggerLabel="Відхилити"
                title="Відхилити скаргу"
                description="Скарга буде закрита без додаткової дії. Користувач побачить коротке пояснення."
                successMessage="Скаргу відхилено."
                requireNote
                noteLabel="Пояснення для користувача"
                tone="danger"
              />
              <AbuseReportActionDialog
                kind="status"
                endpointId={report.id}
                status="ESCALATED"
                triggerLabel="Ескалювати"
                title="Ескалювати скаргу"
                description="Позначте звернення для додаткового перегляду або внутрішньої передачі."
                successMessage="Скаргу ескальовано."
                requireNote
                noteLabel="Чому потрібна ескалація"
              />
            </div>
          </div>
        </section>

        <section className="ui-elevated-panel p-5 sm:p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-copy-strong">Модераційні дії</h2>
            <div className="flex flex-wrap gap-3">
              <AbuseReportActionDialog
                kind="action"
                endpointId={report.id}
                actionType="WARN_USER"
                triggerLabel="Попередити"
                title="Попередити користувача"
                description="Зафіксуйте попередження в аудиті скарги."
                successMessage="Попередження збережено."
                requireNote
                noteLabel="Внутрішня примітка"
              />
              <AbuseReportActionDialog
                kind="action"
                endpointId={report.id}
                actionType="HIDE_REVIEW"
                triggerLabel="Приховати відгук"
                title="Приховати відгук"
                description="Використовуйте лише для скарг на відгуки. Дія підтверджується через review moderation flow."
                successMessage="Дію збережено."
                requireNote
                noteLabel="Причина для модерації"
                tone="danger"
              />
              <AbuseReportActionDialog
                kind="action"
                endpointId={report.id}
                actionType="REJECT_PRODUCT"
                triggerLabel="Відхилити товар"
                title="Відхилити товар"
                description="Використовуйте для товарів, які ще проходять модерацію."
                successMessage="Дію збережено."
                requireNote
                noteLabel="Причина відхилення"
                tone="danger"
              />
              <AbuseReportActionDialog
                kind="action"
                endpointId={report.id}
                actionType="ARCHIVE_PRODUCT"
                triggerLabel="Архівувати товар"
                title="Архівувати товар"
                description="Прибере товар з публічної вітрини, якщо дію підтримує поточний стан товару."
                successMessage="Дію збережено."
                requireNote
                noteLabel="Причина архівації"
                tone="danger"
              />
              <AbuseReportActionDialog
                kind="action"
                endpointId={report.id}
                actionType="SUSPEND_SELLER"
                triggerLabel="Призупинити продавця"
                title="Призупинити продавця"
                description="Використовуйте лише коли target безпечно резолвиться до seller-профілю."
                successMessage="Дію збережено."
                requireNote
                noteLabel="Причина призупинення"
                tone="danger"
              />
              <AbuseReportActionDialog
                kind="action"
                endpointId={report.id}
                actionType="SUSPEND_STORE"
                triggerLabel="Призупинити магазин"
                title="Призупинити магазин"
                description="Це приховає магазин від buyer-facing вітрин."
                successMessage="Дію збережено."
                requireNote
                noteLabel="Причина призупинення"
                tone="danger"
              />
            </div>
          </div>
        </section>

        <section className="ui-elevated-panel p-5 sm:p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-copy-strong">Аудит дій</h2>
            {report.actions.length === 0 ? (
              <p className="text-sm text-copy-muted">Для цієї скарги ще не зафіксовано жодних дій.</p>
            ) : (
              <div className="space-y-3">
                {report.actions.map((action) => (
                  <article
                    key={action.id}
                    className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-copy-strong">
                        {getActionLabel(action.actionType)}
                      </p>
                      <span className="text-xs text-copy-muted">
                        {new Date(action.createdAt).toLocaleString('uk-UA')}
                      </span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-copy-muted">
                      {action.adminName}
                    </p>
                    {action.note ? <p className="mt-2 text-sm text-copy-primary">{action.note}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </aside>
    </div>
  )
}
