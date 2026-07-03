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
      eyebrow="Operations"
      title="Audit logs"
      description="Review admin-sensitive actions with server-redacted metadata summaries for safer incident response."
    >
      <OperationsShell currentPath="/admin/operations/audit-logs">
        <AdminFilterBar action="/admin/operations/audit-logs">
          <SearchInput
            name="actorId"
            label="Actor id"
            defaultValue={data.filters.actorId}
            placeholder="Filter by admin UUID"
          />
          <SearchInput
            name="domain"
            label="Domain"
            defaultValue={data.filters.domain}
            placeholder="e.g. payouts, promotions, refunds"
          />
          <SearchInput
            name="action"
            label="Action"
            defaultValue={data.filters.action}
            placeholder="e.g. retry, approve, update"
          />
          <SearchInput
            name="resourceType"
            label="Resource type"
            defaultValue={data.filters.resourceType}
            placeholder="e.g. job, payout, promotion"
          />
          <label className="space-y-2 xl:w-56">
            <span className="block text-sm font-medium text-copy-strong">From date</span>
            <input type="date" name="dateFrom" defaultValue={data.filters.dateFrom} className="ui-surface-input" />
          </label>
          <label className="space-y-2 xl:w-56">
            <span className="block text-sm font-medium text-copy-strong">To date</span>
            <input type="date" name="dateTo" defaultValue={data.filters.dateTo} className="ui-surface-input" />
          </label>
          <div className="flex gap-2 xl:self-end">
            <button type="submit" className="ui-primary-button">Apply filters</button>
          </div>
        </AdminFilterBar>

        <AdminDataTable
          title="Audit trail"
          description="Metadata is already redacted by the backend before it reaches the operations dashboard."
        >
          {data.status === 'error' ? (
            <div className="p-6">
              <AdminEmptyState
                title="Audit logs unavailable"
                description={data.errorMessage ?? 'Не вдалося завантажити audit logs.'}
              />
            </div>
          ) : data.auditLogs && data.auditLogs.items.length > 0 ? (
            <AuditLogsTable items={data.auditLogs.items} />
          ) : (
            <div className="p-6">
              <AdminEmptyState
                title="No audit logs found"
                description="Sensitive admin actions will appear here once the current filters match recorded entries."
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
