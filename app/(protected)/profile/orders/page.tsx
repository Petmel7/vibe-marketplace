import Link from 'next/link'
import ProfileSection from '@/components/profile/ProfileSection'
import StatusBadge from '@/components/profile/StatusBadge'
import EmptyState from '@/components/profile/EmptyState'
import { getCurrentUser } from '@/lib/session/getSession'
import { formatPrice } from '@/utils/formatters/price'
import { getOrdersPageData } from '@/app/(protected)/profile/_lib/profile-dashboard.data'

export default async function ProfileOrdersPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const orders = await getOrdersPageData(user)

  return (
    <ProfileSection
      eyebrow="Замовлення"
      title="Історія замовлень"
      description="Переглядайте суми, статуси та хід виконання ваших покупок на маркетплейсі."
    >
      {orders.length === 0 ? (
        <EmptyState
          title="Історія замовлень порожня"
          description="Після першого замовлення тут з’являться як завершені, так і активні покупки."
          actionHref="/catalog"
          actionLabel="Переглянути товари"
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/profile/orders/${order.id}`}
              className="ui-elevated-panel block p-5 transition-colors hover:bg-panel/40 sm:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-copy-strong">Замовлення #{order.id.slice(0, 8)}</h2>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-copy-muted">
                    Створено {new Date(order.createdAt).toLocaleDateString('uk-UA')} · {order.itemCount} товарів
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {order.storeNames.map((storeName) => (
                      <span key={storeName} className="rounded-full bg-panel px-3 py-1 text-xs text-copy-primary">
                        {storeName}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1 text-sm text-copy-secondary lg:text-right">
                  <p className="text-xl font-semibold text-copy-strong">{formatPrice(order.totalAmount)}</p>
                  <p>Відкрити деталі</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </ProfileSection>
  )
}
