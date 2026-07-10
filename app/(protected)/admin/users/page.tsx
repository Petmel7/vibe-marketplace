import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import PaginationControls from '@/components/admin/PaginationControls'
import SearchInput from '@/components/admin/SearchInput'
import StatusFilter from '@/components/admin/StatusFilter'
import { getCurrentUser } from '@/lib/session/getSession'
import { ADMIN_USER_ROLE_FILTERS, getAdminRoleTone } from '@/types/admin'
import { getAdminUsersPageData } from '@/app/(protected)/admin/_lib/admin-dashboard.data'

const ROLE_LABELS: Record<string, string> = {
  BUYER: 'Покупець',
  SELLER: 'Продавець',
  ADMIN: 'Адміністратор',
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const rawSearchParams = await searchParams
  const data = await getAdminUsersPageData(user, rawSearchParams)

  return (
    <AdminSection
      eyebrow="Користувачі"
      title="Керування користувачами"
      description="Шукайте акаунти маркетплейсу, перевіряйте призначені ролі та переглядайте метадані акаунтів, не залишаючи адмін-простір."
    >
      <AdminFilterBar action="/admin/users">
        <SearchInput
          name="search"
          label="Пошук користувачів"
          defaultValue={data.filters.search}
          placeholder="Пошук за email або іменем"
        />
        <StatusFilter
          name="role"
          label="Роль"
          defaultValue={data.filters.role}
          options={ADMIN_USER_ROLE_FILTERS.map((role) => ({ label: ROLE_LABELS[role] ?? role, value: role }))}
        />
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Застосувати фільтри</button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Користувачі маркетплейсу"
        description="Ролі, метадані профілів та історія створення для контролю користувачів."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="У цьому поданні немає користувачів"
              description="Спробуйте інший пошуковий запит або фільтр ролі, щоб знайти більше акаунтів."
            />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-panel/60 text-left text-copy-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Користувач</th>
                <th className="px-5 py-3 font-medium">Ролі</th>
                <th className="px-5 py-3 font-medium">Стан онбордингу</th>
                <th className="px-5 py-3 font-medium">Створено</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const onboardingState = item.roles.includes('SELLER')
                  ? 'Продавця активовано'
                  : item.roles.includes('BUYER')
                    ? 'Покупець активний'
                    : 'Роль очікує'

                return (
                  <tr key={item.id} className="border-t border-panelBorder align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-copy-strong">{item.profileName || item.email}</p>
                      <p className="mt-1 text-copy-muted">{item.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {item.roles.map((role) => (
                          <AdminStatusBadge key={role} label={ROLE_LABELS[role] ?? role} tone={getAdminRoleTone(role)} />
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-copy-secondary">{onboardingState}</td>
                    <td className="px-5 py-4 text-copy-secondary">{new Date(item.createdAt).toLocaleDateString('uk-UA')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/users"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          search: data.filters.search,
          role: data.filters.role,
          limit: String(data.limit),
        }}
      />
    </AdminSection>
  )
}
