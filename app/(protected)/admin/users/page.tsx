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
      eyebrow="Users"
      title="User management"
      description="Search marketplace accounts, inspect role assignment, and review account metadata without leaving the admin workspace."
    >
      <AdminFilterBar action="/admin/users">
        <SearchInput
          name="search"
          label="Search users"
          defaultValue={data.filters.search}
          placeholder="Search by email or name"
        />
        <StatusFilter
          name="role"
          label="Role"
          defaultValue={data.filters.role}
          options={ADMIN_USER_ROLE_FILTERS.map((role) => ({ label: role, value: role }))}
        />
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Apply filters</button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Marketplace users"
        description="Roles, profile metadata, and creation history for user oversight."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No users in this view"
              description="Try a different search term or role filter to find more accounts."
            />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-panel/60 text-left text-copy-muted">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Roles</th>
                <th className="px-5 py-3 font-medium">Onboarding state</th>
                <th className="px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const onboardingState = item.roles.includes('SELLER')
                  ? 'Seller enabled'
                  : item.roles.includes('BUYER')
                    ? 'Buyer active'
                    : 'Role pending'

                return (
                  <tr key={item.id} className="border-t border-panelBorder align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-copy-strong">{item.profileName || item.email}</p>
                      <p className="mt-1 text-copy-muted">{item.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {item.roles.map((role) => (
                          <AdminStatusBadge key={role} label={role} tone={getAdminRoleTone(role)} />
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
