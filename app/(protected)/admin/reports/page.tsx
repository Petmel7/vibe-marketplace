import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminSection from '@/components/admin/AdminSection'
import AdminReportsTable from '@/components/abuse-reports/AdminReportsTable'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminReportsPageData } from '@/app/(protected)/admin/_lib/admin-reports.data'

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminReportsPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Trust & Safety"
      title="Abuse reports queue"
      description="Review marketplace abuse reports, filter incoming safety signals, and open detailed moderation workflows."
    >
      <AdminDataTable
        title="Reports"
        description="Use filters to narrow the queue by status, target type, reason, and date."
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
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
                <option value="ESCALATED">Escalated</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-copy-secondary">
              <span>Target</span>
              <select
                name="targetType"
                defaultValue={data.filters.targetType ?? ''}
                className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
              >
                <option value="">All</option>
                <option value="PRODUCT">Product</option>
                <option value="REVIEW">Review</option>
                <option value="STORE">Store</option>
                <option value="USER">User</option>
                <option value="ORDER">Order</option>
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
                <option value="SPAM">Spam</option>
                <option value="SCAM">Scam</option>
                <option value="COUNTERFEIT">Counterfeit</option>
                <option value="PROHIBITED_ITEM">Prohibited item</option>
                <option value="INAPPROPRIATE_CONTENT">Inappropriate content</option>
                <option value="HARASSMENT">Harassment</option>
                <option value="MISLEADING_INFO">Misleading info</option>
                <option value="PAYMENT_ISSUE">Payment issue</option>
                <option value="DELIVERY_ISSUE">Delivery issue</option>
                <option value="OTHER">Other</option>
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
        <div className="p-5 sm:p-6">
          {data.items.length === 0 ? (
            <AdminEmptyState
              title="No reports found"
              description="Reports that match the current filter set will appear here."
            />
          ) : (
            <AdminReportsTable reports={data.items} />
          )}
        </div>
      </AdminDataTable>
    </AdminSection>
  )
}
