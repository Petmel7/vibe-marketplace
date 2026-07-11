import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import SearchInput from '@/components/admin/SearchInput'
import AuditLogsTable from '@/components/operations/AuditLogsTable'
import OperationsShell from '@/components/operations/OperationsShell'
import { getAdminOperationsAuditLogsPageData } from '@/app/(protected)/admin/_lib/admin-operations.data'
import { getCurrentUser } from '@/lib/session/getSession'

export default async function AdminOperationsAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminOperationsAuditLogsPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Операції"
      title="Журнал аудиту"
      description="Переглядайте чутливі дії адміністраторів із серверно-редагованими зведеннями метаданих для безпечнішого реагування на інциденти."
    >
      <OperationsShell currentPath="/admin/operations/audit-logs">
        <AdminFilterBar action="/admin/operations/audit-logs">
          <SearchInput
            name="actorId"
            label="ID виконавця"
            defaultValue={data.filters.actorId}
            placeholder="Фільтр за UUID адміністратора"
          />
          <SearchInput
            name="domain"
            label="Домен"
            defaultValue={data.filters.domain}
            placeholder="напр. виплати, акції, повернення"
          />
          <SearchInput
            name="action"
            label="Дія"
            defaultValue={data.filters.action}
            placeholder="напр. повтор, схвалення, оновлення"
          />
          <SearchInput
            name="resourceType"
            label="Тип ресурсу"
            defaultValue={data.filters.resourceType}
            placeholder="напр. задача, виплата, акція"
          />
          <label className="space-y-2 xl:w-56">
            <span className="block text-sm font-medium text-copy-strong">Від дати</span>
            <input type="date" name="dateFrom" defaultValue={data.filters.dateFrom} className="ui-surface-input" />
          </label>
          <label className="space-y-2 xl:w-56">
            <span className="block text-sm font-medium text-copy-strong">До дати</span>
            <input type="date" name="dateTo" defaultValue={data.filters.dateTo} className="ui-surface-input" />
          </label>
          <div className="flex gap-2 xl:self-end">
            <button type="submit" className="ui-primary-button">Застосувати фільтри</button>
          </div>
        </AdminFilterBar>

        <AdminDataTable
          title="Слід аудиту"
          description="Метадані вже проходять редагування на бекенді до того, як потрапляють у панель операцій."
        >
          {data.status === 'error' ? (
            <div className="p-6">
              <AdminEmptyState
                title="Журнал аудиту недоступний"
                description={data.errorMessage ?? 'Не вдалося завантажити журнал аудиту.'}
              />
            </div>
          ) : data.auditLogs && data.auditLogs.items.length > 0 ? (
            <AuditLogsTable items={data.auditLogs.items} />
          ) : (
            <div className="p-6">
              <AdminEmptyState
                title="Записів аудиту не знайдено"
                description="Чутливі адміністративні дії з’являться тут, щойно поточні фільтри збігатимуться із зафіксованими записами."
              />
            </div>
          )}
        </AdminDataTable>

        {data.status === 'ready' && data.auditLogs ? (
          <PaginationControls
            pathname="/admin/operations/audit-logs"
            page={data.auditLogs.page}
            limit={data.auditLogs.limit}
            total={data.auditLogs.total}
            query={{
              actorId: data.filters.actorId || undefined,
              domain: data.filters.domain || undefined,
              action: data.filters.action || undefined,
              resourceType: data.filters.resourceType || undefined,
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
