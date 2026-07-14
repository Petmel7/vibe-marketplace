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
      eyebrow="Операції"
      title="Фонові задачі"
      description="Переглядайте повторні спроби задач, роботу за розкладом, тиск помилок і ідемпотентні асинхронні сценарії."
    >
      <OperationsShell currentPath="/admin/operations/jobs">
        <AdminFilterBar action="/admin/operations/jobs">
          <StatusFilter
            name="status"
            label="Статус"
            defaultValue={data.filters.status}
            options={OPERATION_JOB_STATUSES.map((status) => ({
              label: getOperationJobStatusLabel(status),
              value: status,
            }))}
          />
          <StatusFilter
            name="type"
            label="Тип"
            defaultValue={data.filters.type}
            options={OPERATION_JOB_TYPES.map((type) => ({
              label: getOperationJobTypeLabel(type),
              value: type,
            }))}
          />
          <label className="space-y-2 xl:w-56">
            <span className="block text-sm font-medium text-copy-strong">Від дати</span>
            <input
              type="date"
              name="dateFrom"
              defaultValue={data.filters.dateFrom}
              className="ui-surface-input"
            />
          </label>
          <label className="space-y-2 xl:w-56">
            <span className="block text-sm font-medium text-copy-strong">До дати</span>
            <input
              type="date"
              name="dateTo"
              defaultValue={data.filters.dateTo}
              className="ui-surface-input"
            />
          </label>
          <div className="flex gap-2 max-[599px]:flex-col max-[599px]:gap-3 max-[599px]:[&>*]:w-full xl:self-end">
            <button type="submit" className="ui-secondary-button">Застосувати фільтри</button>
            <RunDueJobsButton />
          </div>
        </AdminFilterBar>

        <AdminDataTable
          title="Черга задач"
          description="Повторюйте лише невдалі задачі та скасовуйте лише ті, що ще в черзі. Критичні записи замовлень і платежів залишаються синхронними."
        >
          {data.status === 'error' ? (
            <div className="p-6">
              <AdminEmptyState
                title="Діагностика задач недоступна"
                description={data.errorMessage ?? 'Не вдалося завантажити діагностику задач.'}
              />
            </div>
          ) : data.jobs && data.jobs.items.length > 0 ? (
            <JobsTable items={data.jobs.items} />
          ) : (
            <div className="p-6">
              <AdminEmptyState
                title="Задач не знайдено"
                description="Спробуйте розширити фільтри або запустіть задачі за розкладом, якщо чергу потрібно обробити зараз."
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
