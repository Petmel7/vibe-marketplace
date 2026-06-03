import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import AdminDisputesTable from '@/components/disputes/AdminDisputesTable'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminDisputesPageData } from '@/app/(protected)/admin/_lib/admin-disputes.data'

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminDisputesPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Disputes"
      title="Dispute queue"
      description="Контролюйте суперечки по замовленнях, фільтруйте чергу та відкривайте детальні resolution workflows."
    >
      <AdminDataTable
        title="Marketplace disputes"
        description="Фільтруйте суперечки за статусом, причиною, пріоритетом і датою створення."
        actions={
          <form method="GET" className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-copy-secondary">
              <span>Status</span>
              <select
                name="status"
                defaultValue={data.filters.status ?? ''}
                className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="UNDER_REVIEW">Under review</option>
                <option value="WAITING_BUYER">Waiting buyer</option>
                <option value="WAITING_SELLER">Waiting seller</option>
                <option value="ESCALATED">Escalated</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CLOSED">Closed</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-copy-secondary">
              <span>Reason</span>
              <select
                name="reason"
                defaultValue={data.filters.reason ?? ''}
                className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
              >
                <option value="">All</option>
                <option value="ITEM_NOT_RECEIVED">Not received</option>
                <option value="ITEM_NOT_AS_DESCRIBED">Not as described</option>
                <option value="DAMAGED_ITEM">Damaged</option>
                <option value="WRONG_ITEM">Wrong item</option>
                <option value="PAYMENT_ISSUE">Payment issue</option>
                <option value="REFUND_REQUEST">Refund request</option>
                <option value="SELLER_ISSUE">Seller issue</option>
                <option value="BUYER_ISSUE">Buyer issue</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-copy-secondary">
              <span>Priority</span>
              <select
                name="priority"
                defaultValue={data.filters.priority ?? ''}
                className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
              >
                <option value="">All</option>
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-copy-secondary">
              <span>From</span>
              <input
                type="date"
                name="dateFrom"
                defaultValue={data.filters.dateFrom?.slice(0, 10) ?? ''}
                className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-copy-secondary">
              <span>To</span>
              <input
                type="date"
                name="dateTo"
                defaultValue={data.filters.dateTo?.slice(0, 10) ?? ''}
                className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
              />
            </label>
            <button type="submit" className="ui-secondary-button">
              Apply
            </button>
          </form>
        }
      >
        <div className="space-y-5 p-5 sm:p-6">
          {data.items.length === 0 ? (
            <AdminEmptyState
              title="No disputes found"
              description="Disputes that match the current filters will appear here."
            />
          ) : (
            <>
              <AdminDisputesTable disputes={data.items} />
              <PaginationControls
                pathname="/admin/disputes"
                page={data.page}
                limit={data.limit}
                total={data.total}
                query={{
                  status: data.filters.status,
                  reason: data.filters.reason,
                  priority: data.filters.priority,
                  dateFrom: data.filters.dateFrom?.slice(0, 10),
                  dateTo: data.filters.dateTo?.slice(0, 10),
                }}
              />
            </>
          )}
        </div>
      </AdminDataTable>
    </AdminSection>
  )
}
