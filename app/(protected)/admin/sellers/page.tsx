import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminMetricCard from '@/components/admin/AdminMetricCard'
import AdminSection from '@/components/admin/AdminSection'
import AdminSellerModerationActions from '@/components/admin/AdminSellerModerationActions'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import PaginationControls from '@/components/admin/PaginationControls'
import { getCurrentUser } from '@/lib/session/getSession'
import { ADMIN_SELLER_STATUS_FILTERS, getAdminSellerStatusTone } from '@/types/admin'
import { getAdminSellersPageData } from '@/app/(protected)/admin/_lib/admin-dashboard.data'

const SELLER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Очікує',
  VERIFIED: 'Верифіковано',
  REJECTED: 'Відхилено',
  SUSPENDED: 'Призупинено',
}

export default async function AdminSellersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const rawSearchParams = await searchParams
  const data = await getAdminSellersPageData(user, rawSearchParams)

  return (
    <AdminSection
      eyebrow="Продавці"
      title="Керування продавцями"
      description="Відстежуйте стан верифікації, сигнали готовності вітрини та публічну присутність продавців на платформі."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Усього продавців"
          value={data.analytics.totalSellers}
          detail={`${data.analytics.moderationStats.pendingSellerApprovals} очікують схвалення`}
        />
        <AdminMetricCard
          label="Зростання продавців"
          value={data.analytics.sellerGrowthLast30Days}
          detail="Профілі продавців, створені за останні 30 днів"
        />
        <AdminMetricCard
          label="Призупинені продавці"
          value={data.analytics.moderationStats.suspendedSellers}
          detail="Акаунти, які зараз заблоковані для роботи вітрини"
        />
        <AdminMetricCard
          label="Топові вітрини"
          value={data.analytics.topSellers.length}
          detail="Лідери за виторгом, які зараз відстежуються в аналітиці маркетплейсу"
        />
      </div>

      <AdminFilterBar action="/admin/sellers">
        <div className="flex flex-wrap items-end justify-center gap-3 max-[500px]:flex-col max-[500px]:items-stretch">
          <label className="flex w-full max-w-64 flex-col gap-2 text-sm text-copy-secondary max-[500px]:max-w-none">
            <span className="font-medium text-copy-strong">Статус верифікації</span>
            <select name="status" defaultValue={data.filters.status ?? ''} className="ui-surface-input w-full">
              <option value="">Усі</option>
              {ADMIN_SELLER_STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {SELLER_STATUS_LABELS[status] ?? status}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="ui-primary-button max-[500px]:w-full">
            Застосувати фільтри
          </button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Акаунти продавців"
        description="Стани верифікації, готовність онбордингу та масштаб вітрини для кожного продавця."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="У цьому поданні немає продавців"
              description="Змініть фільтр статусу, щоб побачити більше акаунтів продавців."
            />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-panel/60 text-left text-copy-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Продавець</th>
                <th className="px-5 py-3 font-medium">Верифікація</th>
                <th className="px-5 py-3 font-medium">Мережа магазинів</th>
                <th className="px-5 py-3 font-medium">Створено</th>
                <th className="px-5 py-3 font-medium">Дії</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((seller) => (
                <tr key={seller.id} className="border-t border-panelBorder align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-copy-strong">{seller.businessName || 'Продавець без назви'}</p>
                    <p className="mt-1 text-copy-muted">Користувач {seller.userId.slice(0, 8)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <AdminStatusBadge
                      label={SELLER_STATUS_LABELS[seller.verificationStatus] ?? seller.verificationStatus}
                      tone={getAdminSellerStatusTone(seller.verificationStatus)}
                    />
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    <p>{seller.storeCount} підключених магазинів</p>
                    <p className="mt-1 text-copy-muted">
                      {seller.storeCount > 0 ? 'Мережу магазинів налаштовано' : 'Магазини ще не налаштовані'}
                    </p>
                    {seller.verificationStatus === 'VERIFIED' && seller.inactiveStoreCount > 0 ? (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        Увага: {seller.inactiveStoreCount}{' '}
                        {seller.inactiveStoreCount === 1
                          ? 'підключений магазин досі неактивний і прихований'
                          : 'підключених магазинів досі неактивні й приховані'}{' '}
                        з публічного каталогу.
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">{new Date(seller.createdAt).toLocaleDateString('uk-UA')}</td>
                  <td className="px-5 py-4">
                    <AdminSellerModerationActions sellerId={seller.id} verificationStatus={seller.verificationStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/sellers"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          status: data.filters.status,
          limit: String(data.limit),
        }}
      />
    </AdminSection>
  )
}
