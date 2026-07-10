import Link from 'next/link'
import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import StatusFilter from '@/components/admin/StatusFilter'
import CommissionPreviewCard from '@/components/commissions/CommissionPreviewCard'
import CommissionRuleTable from '@/components/commissions/CommissionRuleTable'
import { getAdminCommissionRulesPageData } from '@/app/(protected)/admin/_lib/admin-commission-rules.data'
import { getCurrentUser } from '@/lib/session/getSession'
import { COMMISSION_RULE_SCOPES, getCommissionRuleScopeLabel } from '@/types/commissions'

const COMMISSION_ACTIVE_FILTERS = [
  { label: 'Лише активні', value: 'true' },
  { label: 'Лише вимкнені', value: 'false' },
] as const

export default async function AdminCommissionRulesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const data = await getAdminCommissionRulesPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Фінанси"
      title="Правила комісій"
      description="Керуйте глобальними, категорійними та магазинними ставками комісії, зберігаючи історичні знімки платформної комісії незмінними."
    >
      <AdminFilterBar action="/admin/commission-rules">
        <StatusFilter
          name="scope"
          label="Область дії"
          defaultValue={data.filters.scope}
          options={COMMISSION_RULE_SCOPES.map((scope) => ({
            label: getCommissionRuleScopeLabel(scope),
            value: scope,
          }))}
        />
        <StatusFilter
          name="isActive"
          label="Доступність"
          defaultValue={
            typeof data.filters.isActive === 'boolean' ? String(data.filters.isActive) : undefined
          }
          options={[...COMMISSION_ACTIVE_FILTERS]}
        />
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Застосувати фільтри</button>
          <Link href="/admin/commission-rules/new" className="ui-secondary-button">
            Нове правило
          </Link>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Каталог правил комісій"
        description="Спочатку враховуються пріоритети; якщо пріоритет однаковий, правила магазину мають перевагу над правилами категорії, а правила категорії — над глобальним fallback."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="Правила комісій не знайдено"
              description="Створіть глобальний fallback або більш конкретне перевизначення, щоб політика комісій була прозорою й придатною до аудиту."
            />
          </div>
        ) : (
          <CommissionRuleTable items={data.items} />
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/commission-rules"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          scope: data.filters.scope,
          isActive:
            typeof data.filters.isActive === 'boolean' ? String(data.filters.isActive) : undefined,
          limit: String(data.limit),
        }}
      />

      <CommissionPreviewCard stores={data.stores} categories={data.categories} />
    </AdminSection>
  )
}
