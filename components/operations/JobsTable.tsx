import JobActionDialog from '@/components/operations/JobActionDialog'
import JobStatusBadge from '@/components/operations/JobStatusBadge'
import { DataTable, TableActionCell, TableCell, TableDateCell, TableHead, TableHeaderCell, TableMetaCell, TableRow, TableStatusCell } from '@/components/ui/table'
import { getOperationJobTypeLabel, type AdminOperationsJob } from '@/types/operations'

export default function JobsTable({ items }: { items: AdminOperationsJob[] }) {
  return (
    <DataTable>
      <TableHead>
        <tr>
          <TableHeaderCell>Задача</TableHeaderCell>
          <TableHeaderCell>Статус</TableHeaderCell>
          <TableHeaderCell>Спроби</TableHeaderCell>
          <TableHeaderCell>Запуск</TableHeaderCell>
          <TableHeaderCell>Оброблено</TableHeaderCell>
          <TableHeaderCell>Помилка</TableHeaderCell>
          <TableHeaderCell>Помилка</TableHeaderCell>
          <TableHeaderCell>Дії</TableHeaderCell>
        </tr>
      </TableHead>
      <tbody>
        {items.map((job) => (
          <TableRow key={job.id}>
            <TableMetaCell title={getOperationJobTypeLabel(job.type)} meta={<span className="break-all">{job.dedupeKey ?? 'Без ключа дедуплікації'}</span>} />
            <TableStatusCell>
              <JobStatusBadge status={job.status} />
            </TableStatusCell>
            <TableCell tone="secondary">
              {job.attempts} / {job.maxAttempts}
              <p className="mt-1 text-xs text-copy-muted">
                Заблоковано: {job.lockedAt ? new Date(job.lockedAt).toLocaleString('uk-UA') : '—'}
              </p>
            </TableCell>
            <TableCell tone="secondary">
              {job.runAt ? new Date(job.runAt).toLocaleString('uk-UA') : '—'}
              <p className="mt-1 text-xs text-copy-muted">Створено: {new Date(job.createdAt).toLocaleString('uk-UA')}</p>
            </TableCell>
            <TableDateCell value={job.processedAt} />
            <TableDateCell value={job.failedAt} />
            <TableCell tone="secondary">
              <span className="line-clamp-3">{job.errorMessage ?? '—'}</span>
            </TableCell>
            <TableActionCell>
              {job.status === 'FAILED' ? <JobActionDialog jobId={job.id} action="retry" /> : null}
              {job.status === 'PENDING' ? <JobActionDialog jobId={job.id} action="cancel" /> : null}
            </TableActionCell>
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  )
}
