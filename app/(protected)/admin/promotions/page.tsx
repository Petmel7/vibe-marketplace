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
  { label: 'Лише активні', value: 'true' },
  { label: 'Лише вимкнені', value: 'false' },
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
      eyebrow="Акції"
      title="Керування купонами маркетплейсу"
      description="Створюйте купони для всього маркетплейсу та автоматичні знижки, зберігаючи валідацію знижок і облік використання повністю під контролем бекенду."
    >
      <AdminFilterBar action="/admin/promotions">
        <SearchInput
          name="code"
          label="Код купона"
          defaultValue={data.filters.code}
          placeholder="Фільтр за кодом"
        />
        <StatusFilter
          name="type"
          label="Тип акції"
          defaultValue={data.filters.type}
          options={PROMOTION_TYPES.map((type) => ({
            label: getPromotionTypeLabel(type),
            value: type,
          }))}
        />
        <StatusFilter
          name="isActive"
          label="Доступність"
          defaultValue={
            typeof data.filters.isActive === 'boolean' ? String(data.filters.isActive) : undefined
          }
          options={[...PROMOTION_ACTIVE_FILTERS]}
        />
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Застосувати фільтри</button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Каталог акцій"
        description="Переглядайте періоди дії, використання та статус акцій перед редагуванням або вимкненням."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="Акцій ще немає"
              description="Створіть свій перший купон або автоматичну знижку, щоб почати тестувати checkout зі сценаріями акцій."
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
