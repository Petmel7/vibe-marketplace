import Link from 'next/link'
import AbuseReportStatusBadge from './AbuseReportStatusBadge'
import ReportTargetPreview from './ReportTargetPreview'
import { DataTable, TableActionCell, TableCell, TableDateCell, TableHead, TableHeaderCell, TableRow, TableStatusCell } from '@/components/ui/table'
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
    <DataTable className="divide-y divide-panelBorder text-left">
      <TableHead className="bg-panelAlt/70 text-copy-secondary">
        <tr>
          <TableHeaderCell>Target</TableHeaderCell>
          <TableHeaderCell>Reason</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Created</TableHeaderCell>
          <TableHeaderCell>Action</TableHeaderCell>
        </tr>
      </TableHead>
      <tbody className="divide-y divide-panelBorder">
        {reports.map((report) => (
          <TableRow key={report.id} className="border-t-0">
            <TableCell>
              <ReportTargetPreview preview={report.targetPreview} />
            </TableCell>
            <TableCell tone="primary">{getReasonLabel(report.reason)}</TableCell>
            <TableStatusCell>
              <AbuseReportStatusBadge status={report.status} />
            </TableStatusCell>
            <TableDateCell value={report.createdAt} mode="date" />
            <TableActionCell>
              <Link href={`/admin/reports/${report.id}`} className="ui-secondary-button">
                Open
              </Link>
            </TableActionCell>
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  )
}
