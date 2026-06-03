import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import SearchInput from '@/components/admin/SearchInput'
import StatusFilter from '@/components/admin/StatusFilter'
import PromotionForm from '@/components/promotions/PromotionForm'
import PromotionTable from '@/components/promotions/PromotionTable'
import { getAdminPromotionsPageData } from '@/app/(protected)/admin/_lib/admin-promotions.data'
import { getCurrentUser } from '@/lib/session/getSession'
import {
  PROMOTION_TYPES,
  getPromotionTypeLabel,
} from '@/types/promotions'

const PROMOTION_ACTIVE_FILTERS = [
  { label: 'Active only', value: 'true' },
  { label: 'Disabled only', value: 'false' },
] as const

export default async function AdminPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const data = await getAdminPromotionsPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Promotions"
      title="Marketplace coupon management"
      description="Create marketplace-wide coupon codes and automatic discounts while keeping discount validation and usage tracking authoritative on the backend."
    >
      <AdminFilterBar action="/admin/promotions">
        <SearchInput
          name="code"
          label="Coupon code"
          defaultValue={data.filters.code}
          placeholder="Filter by code"
        />
        <StatusFilter
          name="type"
          label="Promotion type"
          defaultValue={data.filters.type}
          options={PROMOTION_TYPES.map((type) => ({
            label: getPromotionTypeLabel(type),
            value: type,
          }))}
        />
        <StatusFilter
          name="isActive"
          label="Availability"
          defaultValue={
            typeof data.filters.isActive === 'boolean' ? String(data.filters.isActive) : undefined
          }
          options={[...PROMOTION_ACTIVE_FILTERS]}
        />
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Apply filters</button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Promotion catalog"
        description="Review campaign windows, usage, and status before editing or disabling a promotion."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No promotions yet"
              description="Create your first coupon or automatic discount to start testing promotion-aware checkout flows."
            />
          </div>
        ) : (
          <PromotionTable items={data.items} />
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/promotions"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          code: data.filters.code,
          type: data.filters.type,
          isActive:
            typeof data.filters.isActive === 'boolean' ? String(data.filters.isActive) : undefined,
          limit: String(data.limit),
        }}
      />

      <PromotionForm mode="create" />
    </AdminSection>
  )
}
