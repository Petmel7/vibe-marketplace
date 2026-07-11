import JobActionDialog from '@/components/operations/JobActionDialog'
import JobStatusBadge from '@/components/operations/JobStatusBadge'
import { getOperationJobTypeLabel, type AdminOperationsJob } from '@/types/operations'

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString('uk-UA') : '—'
}

export default function JobsTable({ items }: { items: AdminOperationsJob[] }) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-panel/60 text-left text-copy-muted">
        <tr>
          <th className="px-5 py-3 font-medium">Задача</th>
          <th className="px-5 py-3 font-medium">Статус</th>
          <th className="px-5 py-3 font-medium">Спроби</th>
          <th className="px-5 py-3 font-medium">Запуск</th>
          <th className="px-5 py-3 font-medium">Оброблено</th>
          <th className="px-5 py-3 font-medium">Помилка</th>
          <th className="px-5 py-3 font-medium">Помилка</th>
          <th className="px-5 py-3 font-medium">Дії</th>
        </tr>
      </thead>
      <tbody>
        {items.map((job) => (
          <tr key={job.id} className="border-t border-panelBorder align-top">
            <td className="px-5 py-4">
              <p className="font-semibold text-copy-strong">{getOperationJobTypeLabel(job.type)}</p>
              <p className="mt-1 break-all text-xs text-copy-muted">{job.dedupeKey ?? 'Без ключа дедуплікації'}</p>
            </td>
            <td className="px-5 py-4">
              <JobStatusBadge status={job.status} />
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              {job.attempts} / {job.maxAttempts}
              <p className="mt-1 text-xs text-copy-muted">Заблоковано: {formatDateTime(job.lockedAt)}</p>
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              {formatDateTime(job.runAt)}
              <p className="mt-1 text-xs text-copy-muted">Створено: {formatDateTime(job.createdAt)}</p>
            </td>
            <td className="px-5 py-4 text-copy-secondary">{formatDateTime(job.processedAt)}</td>
            <td className="px-5 py-4 text-copy-secondary">{formatDateTime(job.failedAt)}</td>
            <td className="px-5 py-4 text-copy-secondary">
              <span className="line-clamp-3">{job.errorMessage ?? '—'}</span>
            </td>
            <td className="px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {job.status === 'FAILED' ? <JobActionDialog jobId={job.id} action="retry" /> : null}
                {job.status === 'PENDING' ? <JobActionDialog jobId={job.id} action="cancel" /> : null}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
