import Link from 'next/link'
import AbuseReportStatusBadge from './AbuseReportStatusBadge'
import ReportTargetPreview from './ReportTargetPreview'
import type { ReportSummary } from '@/types/abuse-reports'

function getReasonLabel(reason: ReportSummary['reason']) {
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
      return 'Домагання'
    case 'MISLEADING_INFO':
      return 'Оманлива інформація'
    case 'PAYMENT_ISSUE':
      return 'Оплата'
    case 'DELIVERY_ISSUE':
      return 'Доставка'
    case 'OTHER':
      return 'Інше'
  }
}

export default function AdminReportsTable({ reports }: { reports: ReportSummary[] }) {
  return (
    <table className="min-w-full divide-y divide-panelBorder text-left text-sm">
      <thead className="bg-panelAlt/70 text-copy-secondary">
        <tr>
          <th className="px-5 py-3 font-medium">Target</th>
          <th className="px-5 py-3 font-medium">Reason</th>
          <th className="px-5 py-3 font-medium">Status</th>
          <th className="px-5 py-3 font-medium">Created</th>
          <th className="px-5 py-3 font-medium">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-panelBorder">
        {reports.map((report) => (
          <tr key={report.id} className="align-top">
            <td className="px-5 py-4">
              <ReportTargetPreview preview={report.targetPreview} />
            </td>
            <td className="px-5 py-4 text-copy-primary">{getReasonLabel(report.reason)}</td>
            <td className="px-5 py-4">
              <AbuseReportStatusBadge status={report.status} />
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              {new Date(report.createdAt).toLocaleDateString('uk-UA')}
            </td>
            <td className="px-5 py-4">
              <Link href={`/admin/reports/${report.id}`} className="ui-secondary-button">
                Open
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
