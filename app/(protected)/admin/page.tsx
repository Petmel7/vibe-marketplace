import Link from 'next/link'
import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminMetricCard from '@/components/admin/AdminMetricCard'
import AdminSection from '@/components/admin/AdminSection'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import ModerationQueueCard from '@/components/admin/ModerationQueueCard'
import { getCurrentUser } from '@/lib/session/getSession'
import { formatPrice } from '@/utils/formatters/price'
import {
  getAdminProductStatusTone,
  getAdminSellerStatusTone,
} from '@/types/admin'
import { getAdminOverviewData } from '@/app/(protected)/admin/_lib/admin-dashboard.data'
import { logInfo } from '@/utils/logger'

export default async function AdminOverviewPage() {
  logInfo('admin-page:start', {
    domain: 'admin',
    route: '/admin',
  })
  const user = await getCurrentUser()
  if (!user) return null

  logInfo('admin-page:before-data', {
    domain: 'admin',
    route: '/admin',
    adminId: user.id,
  })
  const data = await getAdminOverviewData(user)
  logInfo('admin-page:after-data', {
    domain: 'admin',
    route: '/admin',
    adminId: user.id,
  })

  return (
    <AdminSection
      eyebrow="Огляд маркетплейсу"
      title="Панель адміністратора"
      description="Відстежуйте стан маркетплейсу, навантаження модерації та операційне зростання в єдиному робочому просторі."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard
          label="GMV"
          value={formatPrice(data.analytics.gmv)}
          detail={`Створено замовлень за останні 30 днів: ${data.analytics.orderGrowthLast30Days}`}
        />
        <AdminMetricCard
          label="Замовлення"
          value={data.analytics.totalOrders}
          detail={`Товарів очікують модерації: ${data.analytics.moderationStats.pendingProductApprovals}`}
        />
        <AdminMetricCard
          label="Продавці"
          value={data.analytics.totalSellers}
          detail={`Профілів продавців створено за 30 днів: ${data.analytics.sellerGrowthLast30Days}`}
        />
        <AdminMetricCard
          label="Покупці"
          value={data.analytics.totalBuyers}
          detail="Активні акаунти покупців, доступні для контролю замовлень і підтримки"
        />
        <AdminMetricCard
          label="Каталог"
          value={data.analytics.totalProducts}
          detail={`Відхилених товарів у відстеженні: ${data.analytics.moderationStats.rejectedProducts}`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ModerationQueueCard
          label="Продавці в очікуванні"
          count={data.analytics.moderationStats.pendingSellerApprovals}
          description="Заявки продавців, які очікують перевірки."
          href="/admin/moderation"
        />
        <ModerationQueueCard
          label="Товари в очікуванні"
          count={data.analytics.moderationStats.pendingProductApprovals}
          description="Товари в черзі на схвалення публікації."
          href="/admin/moderation"
        />
        <ModerationQueueCard
          label="Призупинені продавці"
          count={data.analytics.moderationStats.suspendedSellers}
          description="Власники магазинів, яким зараз заблоковано активність на маркетплейсі."
          href="/admin/sellers?status=SUSPENDED"
        />
        <ModerationQueueCard
          label="Відхилені товари"
          count={data.analytics.moderationStats.rejectedProducts}
          description="Відхилені позиції каталогу, які можуть потребувати подальших дій або архівації."
          href="/admin/products?status=REJECTED"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <AdminDataTable
          title="Пульс модерації"
          description="Найновіші елементи модерації серед продавців і товарів."
          actions={<Link href="/admin/moderation" className="ui-link-muted">Відкрити модерацію</Link>}
        >
          {data.pendingSellerQueue.items.length === 0 && data.pendingProductQueue.items.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="Немає елементів модерації в очікуванні"
                description="Заявки продавців і товари, що очікують схвалення, автоматично з’являться тут."
              />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-panel/60 text-left text-copy-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Елемент черги</th>
                  <th className="px-5 py-3 font-medium">Власник</th>
                  <th className="px-5 py-3 font-medium">Стан</th>
                </tr>
              </thead>
              <tbody>
                {data.pendingSellerQueue.items.map((seller) => (
                  <tr key={`seller-${seller.id}`} className="border-t border-panelBorder align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-copy-strong">{seller.businessName || 'Заявка продавця без назви'}</p>
                      <p className="mt-1 text-copy-muted">Черга верифікації продавців</p>
                    </td>
                    <td className="px-5 py-4 text-copy-secondary">{seller.userId.slice(0, 8)}</td>
                    <td className="px-5 py-4">
                      <AdminStatusBadge label={seller.verificationStatus} tone={getAdminSellerStatusTone(seller.verificationStatus)} />
                    </td>
                  </tr>
                ))}
                {data.pendingProductQueue.items.map((product) => (
                  <tr key={`product-${product.id}`} className="border-t border-panelBorder align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-copy-strong">{product.name}</p>
                      <p className="mt-1 text-copy-muted">Черга модерації товарів</p>
                    </td>
                    <td className="px-5 py-4 text-copy-secondary">{product.storeName}</td>
                    <td className="px-5 py-4">
                      <AdminStatusBadge label={product.status} tone={getAdminProductStatusTone(product.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AdminDataTable>

        <div className="space-y-6">
          <AdminDataTable
            title="Топ продавців"
            description="Магазини з найбільшою виручкою за поточним аналітичним знімком."
            actions={<Link href="/admin/sellers" className="ui-link-muted">Переглянути продавців</Link>}
          >
            {data.analytics.topSellers.length === 0 ? (
              <div className="p-6">
                <AdminEmptyState
                  title="Ще немає виручки продавців"
                  description="Топ продавців з’явиться, щойно замовлення почнуть проходити через вітрини маркетплейсу."
                />
              </div>
            ) : (
              <div className="space-y-4 p-5 sm:p-6">
                {data.analytics.topSellers.slice(0, 5).map((seller) => (
                  <div key={seller.sellerId} className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-copy-strong">{seller.storeName}</p>
                        <p className="mt-1 text-sm text-copy-muted">{seller.orderCount} замовлень маркетплейсу</p>
                      </div>
                      <p className="text-sm font-semibold text-copy-strong">{formatPrice(seller.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminDataTable>

          <AdminDataTable
            title="Топ товарів"
            description="Лідери каталогу маркетплейсу за кількістю продажів і виручкою."
            actions={<Link href="/admin/products" className="ui-link-muted">Переглянути товари</Link>}
          >
            {data.analytics.topProducts.length === 0 ? (
              <div className="p-6">
                <AdminEmptyState
                  title="Топ товарів поки що немає"
                  description="Найуспішніші товари з’являться тут, щойно накопичиться достатній обсяг замовлень."
                />
              </div>
            ) : (
              <div className="space-y-4 p-5 sm:p-6">
                {data.analytics.topProducts.slice(0, 5).map((product) => (
                  <div key={product.productId} className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-copy-strong">{product.name}</p>
                        <p className="mt-1 text-sm text-copy-muted">{product.totalSold} проданих одиниць</p>
                      </div>
                      <p className="text-sm font-semibold text-copy-strong">{formatPrice(product.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminDataTable>
        </div>
      </div>
    </AdminSection>
  )
}
