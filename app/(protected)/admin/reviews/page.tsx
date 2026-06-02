import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminSection from '@/components/admin/AdminSection'
import AdminReviewModerationForm from '@/components/reviews/AdminReviewModerationForm'
import ReviewList from '@/components/reviews/ReviewList'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminReviewsPageData } from '@/app/(protected)/admin/_lib/admin-dashboard.data'

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminReviewsPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Reviews"
      title="Review moderation queue"
      description="Approve, reject, hide, and restore marketplace reviews using the backend moderation workflow."
    >
      <AdminDataTable
        title="Review queue"
        description="Filter by moderation status and respond without exposing moderation controls publicly."
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
                <option value="PUBLISHED">Published</option>
                <option value="REJECTED">Rejected</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </label>
            <button type="submit" className="ui-secondary-button">
              Apply
            </button>
          </form>
        }
      >
        <div className="p-5 sm:p-6">
          <ReviewList
            reviews={data.items}
            showProductMeta
            emptyState={
              <AdminEmptyState
                title="No reviews in this queue"
                description="Reviews that match the current filter will appear here for moderation."
              />
            }
            renderAction={(review) => (
              <div className="w-full max-w-md">
                <AdminReviewModerationForm review={review} />
              </div>
            )}
          />
        </div>
      </AdminDataTable>
    </AdminSection>
  )
}
