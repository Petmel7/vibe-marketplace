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
      eyebrow="Відгуки"
      title="Черга модерації відгуків"
      description="Схвалюйте, відхиляйте, приховуйте та відновлюйте відгуки маркетплейсу через backend-процес модерації."
    >
      <AdminDataTable
        title="Черга відгуків"
        description="Фільтруйте за статусом модерації та реагуйте без публічного показу інструментів модерації."
        actions={
          <form method="GET" className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-copy-secondary">
              <span>Статус</span>
              <select
                name="status"
                defaultValue={data.filters.status ?? ''}
                className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
              >
                <option value="">Усі</option>
                <option value="PENDING">Очікує</option>
                <option value="PUBLISHED">Опубліковано</option>
                <option value="REJECTED">Відхилено</option>
                <option value="HIDDEN">Приховано</option>
              </select>
            </label>
            <button type="submit" className="ui-secondary-button">
              Застосувати
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
                title="У цій черзі немає відгуків"
                description="Тут з’являться відгуки, які відповідають поточному фільтру."
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
