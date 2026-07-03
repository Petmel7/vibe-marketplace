import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import StatusFilter from '@/components/admin/StatusFilter'
import JobsTable from '@/components/operations/JobsTable'
import OperationsShell from '@/components/operations/OperationsShell'
import RunDueJobsButton from '@/components/operations/RunDueJobsButton'
import { getAdminOperationsJobsPageData } from '@/app/(protected)/admin/_lib/admin-operations.data'
import { getCurrentUser } from '@/lib/session/getSession'
import { getOperationJobStatusLabel, getOperationJobTypeLabel, OPERATION_JOB_STATUSES, OPERATION_JOB_TYPES } from '@/types/operations'

export default async function AdminOperationsJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminOperationsJobsPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Operations"
      title="Background jobs"
      description="Inspect job retries, due work, failure pressure, and idempotent async workflows."
    >
      <OperationsShell currentPath="/admin/operations/jobs">
        <AdminFilterBar action="/admin/operations/jobs">
          <StatusFilter
            name="status"
            label="Status"
            defaultValue={data.filters.status}
            options={OPERATION_JOB_STATUSES.map((status) => ({
              label: getOperationJobStatusLabel(status),
              value: status,
            }))}
          />
          <StatusFilter
            name="type"
            label="Type"
            defaultValue={data.filters.type}
            options={OPERATION_JOB_TYPES.map((type) => ({
              label: getOperationJobTypeLabel(type),
              value: type,
            }))}
          />
          <label className="space-y-2 xl:w-56">
            <span className="block text-sm font-medium text-copy-strong">From date</span>
            <input
              type="date"
              name="dateFrom"
              defaultValue={data.filters.dateFrom}
              className="ui-surface-input"
            />
          </label>
          <label className="space-y-2 xl:w-56">
            <span className="block text-sm font-medium text-copy-strong">To date</span>
            <input
              type="date"
              name="dateTo"
              defaultValue={data.filters.dateTo}
              className="ui-surface-input"
            />
          </label>
          <div className="flex gap-2 xl:self-end">
            <button type="submit" className="ui-secondary-button">Apply filters</button>
            <RunDueJobsButton />
          </div>
        </AdminFilterBar>

        <AdminDataTable
          title="Jobs queue"
          description="Retry only failed work and cancel only queued jobs. Critical order/payment writes remain synchronous."
        >
          {data.status === 'error' ? (
            <div className="p-6">
              <AdminEmptyState
                title="Jobs diagnostics unavailable"
                description={data.errorMessage ?? 'Не вдалося завантажити jobs diagnostics.'}
              />
            </div>
          ) : data.jobs && data.jobs.items.length > 0 ? (
            <JobsTable items={data.jobs.items} />
          ) : (
            <div className="p-6">
              <AdminEmptyState
                title="No jobs found"
                description="Try widening the filters or run due jobs if queued work should be processed now."
              />
            </div>
          )}
        </AdminDataTable>

        {data.status === 'ready' && data.jobs ? (
          <PaginationControls
            pathname="/admin/operations/jobs"
            page={data.jobs.page}
            limit={data.jobs.limit}
            total={data.jobs.total}
            query={{
              status: data.filters.status || undefined,
              type: data.filters.type || undefined,
              dateFrom: data.filters.dateFrom || undefined,
              dateTo: data.filters.dateTo || undefined,
              limit: String(data.filters.limit),
            }}
          />
        ) : null}
      </OperationsShell>
    </AdminSection>
  )
}
