import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import PaginationControls from '@/components/admin/PaginationControls'
import SearchInput from '@/components/admin/SearchInput'
import StatusFilter from '@/components/admin/StatusFilter'
import {
  DataTable,
  TableCell,
  TableDateCell,
  TableHead,
  TableHeaderCell,
  TableMetaCell,
  TableRow,
  TableStatusCell,
} from '@/components/ui/table'
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
        <div className="flex w-full flex-col items-center gap-3 max-[500px]:items-stretch">
          <div className="flex w-full flex-col items-center gap-3 max-[500px]:items-stretch min-[1146px]:flex-row min-[1146px]:justify-center min-[1146px]:items-end">
            <div className="w-full max-w-md max-[500px]:max-w-none">
              <SearchInput
                name="search"
                label="Пошук користувачів"
                defaultValue={data.filters.search}
                placeholder="Пошук за email або іменем"
              />
            </div>
            <div className="w-full max-w-md max-[500px]:max-w-none">
              <StatusFilter
                name="role"
                label="Роль"
                defaultValue={data.filters.role}
                options={ADMIN_USER_ROLE_FILTERS.map((role) => ({ label: ROLE_LABELS[role] ?? role, value: role }))}
              />
            </div>
          </div>
          <button type="submit" className="ui-primary-button max-[500px]:w-full">
            Застосувати фільтри
          </button>
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
          <DataTable>
            <TableHead>
              <tr>
                <TableHeaderCell>Користувач</TableHeaderCell>
                <TableHeaderCell>Ролі</TableHeaderCell>
                <TableHeaderCell>Стан онбордингу</TableHeaderCell>
                <TableHeaderCell>Створено</TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {data.items.map((item) => {
                const onboardingState = item.roles.includes('SELLER')
                  ? 'Продавця активовано'
                  : item.roles.includes('BUYER')
                    ? 'Покупець активний'
                    : 'Роль очікує'

                return (
                  <TableRow key={item.id}>
                    <TableMetaCell title={item.profileName || item.email} meta={item.email} />
                    <TableStatusCell>
                      <div className="flex flex-wrap gap-2">
                        {item.roles.map((role) => (
                          <AdminStatusBadge key={role} label={ROLE_LABELS[role] ?? role} tone={getAdminRoleTone(role)} />
                        ))}
                      </div>
                    </TableStatusCell>
                    <TableCell tone="secondary">{onboardingState}</TableCell>
                    <TableDateCell value={item.createdAt} mode="date" />
                  </TableRow>
                )
              })}
            </tbody>
          </DataTable>
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
