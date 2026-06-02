import AbuseReportStatusBadge from './AbuseReportStatusBadge'
import MyReportEvidenceSection from './MyReportEvidenceSection'
import ReportTargetPreview from './ReportTargetPreview'
import type { MyReport } from '@/types/abuse-reports'

function getReasonLabel(reason: MyReport['reason']) {
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

export default function MyReportsList({ reports }: { reports: MyReport[] }) {
  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <article
          key={report.id}
          className="rounded-[28px] border border-panelBorder bg-panel px-5 py-5 shadow-sm sm:px-6"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <ReportTargetPreview preview={report.targetPreview} />
                <p className="text-sm text-copy-secondary">Причина: {getReasonLabel(report.reason)}</p>
              </div>
              <AbuseReportStatusBadge status={report.status} />
            </div>

            {report.description ? (
              <p className="text-sm leading-6 text-copy-primary">{report.description}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 text-xs text-copy-muted">
              <span>Створено {new Date(report.createdAt).toLocaleDateString('uk-UA')}</span>
              {report.resolvedAt ? (
                <span>Оновлено {new Date(report.resolvedAt).toLocaleDateString('uk-UA')}</span>
              ) : null}
            </div>

            <MyReportEvidenceSection reportId={report.id} />

            {report.resolutionNote ? (
              <div className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-copy-muted">
                  Підсумок розгляду
                </p>
                <p className="mt-2 text-sm text-copy-primary">{report.resolutionNote}</p>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}
