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
        <div className="flex w-full flex-col items-center gap-3 max-[500px]:items-stretch">
          <div className="grid w-full max-w-md gap-3 max-[500px]:max-w-none min-[1146px]:max-w-none min-[1146px]:grid-cols-2">
            <div>
              <StatusFilter
                name="scope"
                label="Область дії"
                defaultValue={data.filters.scope}
                options={COMMISSION_RULE_SCOPES.map((scope) => ({
                  label: getCommissionRuleScopeLabel(scope),
                  value: scope,
                }))}
              />
            </div>
            <div>
              <StatusFilter
                name="isActive"
                label="Доступність"
                defaultValue={
                  typeof data.filters.isActive === 'boolean' ? String(data.filters.isActive) : undefined
                }
                options={[...COMMISSION_ACTIVE_FILTERS]}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 max-[500px]:items-stretch min-[501px]:flex-row min-[501px]:justify-center">
            <button type="submit" className="ui-primary-button max-[500px]:w-full">Застосувати фільтри</button>
            <Link href="/admin/commission-rules/new" className="ui-secondary-button max-[500px]:w-full">
              Нове правило
            </Link>
          </div>
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
