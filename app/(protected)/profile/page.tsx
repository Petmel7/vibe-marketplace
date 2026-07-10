import Link from 'next/link'
import ProductCard from '@/components/product/ProductCard'
import DashboardCard from '@/components/profile/DashboardCard'
import EmptyState from '@/components/profile/EmptyState'
import ProfileSection from '@/components/profile/ProfileSection'
import StatusBadge from '@/components/profile/StatusBadge'
import { getCurrentUser } from '@/lib/session/getSession'
import { formatPrice } from '@/utils/formatters/price'
import { getProfileOverviewData } from '@/app/(protected)/profile/_lib/profile-dashboard.data'
import { logInfo } from '@/utils/logger'

export default async function ProfileOverviewPage() {
  logInfo('profile-page:start', {
    domain: 'profile',
    route: '/profile',
  })
  const user = await getCurrentUser()
  if (!user) return null

  logInfo('profile-page:before-data', {
    domain: 'profile',
    route: '/profile',
    userId: user.id,
  })
  const data = await getProfileOverviewData(user)
  logInfo('profile-page:after-data', {
    domain: 'profile',
    route: '/profile',
    userId: user.id,
  })

  return (
    <ProfileSection
      eyebrow="Огляд"
      title="Кабінет покупця"
      description="Відстежуйте замовлення, адреси, обране та нещодавно переглянуті товари в одному місці."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <DashboardCard
          title="Профіль"
          description="Основні дані акаунта, які надалі використовуватимуться для лояльності, підтримки та сповіщень."
          action={<Link href="/profile/settings" className="ui-link-muted">Редагувати профіль</Link>}
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Ім’я профілю</dt>
              <dd className="mt-2 text-sm text-copy-primary">
                {data.profile?.displayName || 'Додайте ім’я профілю в налаштуваннях'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Покупець з</dt>
              <dd className="mt-2 text-sm text-copy-primary">
                {data.profile ? new Date(data.profile.createdAt).toLocaleDateString('uk-UA') : 'Невідомо'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Телефон</dt>
              <dd className="mt-2 text-sm text-copy-primary">
                {data.profile?.phoneNumber || 'Додайте номер телефону, щоб пришвидшити оформлення'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Електронна пошта</dt>
              <dd className="mt-2 break-all text-sm text-copy-primary">{data.user.email}</dd>
            </div>
          </dl>
        </DashboardCard>

        <DashboardCard
          title="Обране"
          description="Збережені товари прив’язані до вашого акаунта й доступні в усіх сесіях."
          action={<Link href="/profile/wishlist" className="ui-link-muted">Відкрити обране</Link>}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Збережені товари</p>
              <p className="mt-3 text-3xl font-semibold text-copy-strong">{data.wishlist.items.length}</p>
            </div>
            <div className="rounded-2xl bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Переглянуті товари</p>
              <p className="mt-3 text-3xl font-semibold text-copy-strong">{data.viewed.items.length}</p>
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <DashboardCard
          title="Останні замовлення"
          description="Короткий зріз вашої останньої активності покупця."
          action={<Link href="/profile/orders" className="ui-link-muted">Усі замовлення</Link>}
        >
          {data.recentOrders.length === 0 ? (
            <EmptyState
              title="Замовлень ще немає"
              description="Коли ви оформите перше замовлення, його статус і сума з’являться тут."
              actionHref="/catalog"
              actionLabel="Перейти до каталогу"
            />
          ) : (
            <div className="space-y-4">
              {data.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/profile/orders/${order.id}`}
                  className="block rounded-2xl border border-panelBorder bg-panel px-4 py-4 transition-colors hover:bg-panelAlt"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-copy-strong">Замовлення #{order.id.slice(0, 8)}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-copy-muted">
                        {order.itemCount} товарів · {order.storeNames.join(', ')}
                      </p>
                    </div>
                    <div className="text-sm text-copy-secondary">
                      <p className="font-semibold text-copy-strong">{formatPrice(order.totalAmount)}</p>
                      <p>{new Date(order.createdAt).toLocaleDateString('uk-UA')}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DashboardCard>

        <DashboardCard
          title="Основна адреса доставки"
          description="Ваш пріоритетний напрямок доставки для майбутніх замовлень."
          action={<Link href="/profile/addresses" className="ui-link-muted">Керувати адресами</Link>}
        >
          {data.defaultAddress ? (
            <div className="space-y-2 text-sm text-copy-secondary">
              <p className="font-semibold text-copy-strong">{data.defaultAddress.fullName}</p>
              <p>{data.defaultAddress.phone}</p>
              <p>
                {data.defaultAddress.street}, {data.defaultAddress.building}
                {data.defaultAddress.apartment ? `, кв. ${data.defaultAddress.apartment}` : ''}
              </p>
              <p>
                {data.defaultAddress.city}
                {data.defaultAddress.region ? `, ${data.defaultAddress.region}` : ''}, {data.defaultAddress.country}
              </p>
              <p>Усього збережено адрес: {data.addressCount}</p>
            </div>
          ) : (
            <EmptyState
              title="Основної адреси немає"
              description="Збережіть адресу доставки, щоб пришвидшити оформлення та розрахунок доставки."
              actionHref="/profile/addresses"
              actionLabel="Додати адресу"
            />
          )}
        </DashboardCard>
      </div>

      <DashboardCard
        title="Відгуки та оцінки"
        description="Відкрийте центр відгуків, щоб повернутися до товарів і залишити підтверджений відгук зі сторінки товару."
        action={<Link href="/profile/reviews" className="ui-link-muted">Відкрити центр відгуків</Link>}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-panel p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Центр відгуків</p>
            <p className="mt-3 text-3xl font-semibold text-copy-strong">
              {data.viewed.items.length > 0 ? 'Готово' : '—'}
            </p>
          </div>
          <div className="rounded-2xl bg-panel p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Товари в обраному</p>
            <p className="mt-3 text-3xl font-semibold text-copy-strong">{data.wishlist.items.length}</p>
          </div>
          <div className="rounded-2xl bg-panel p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Нещодавні товари</p>
            <p className="mt-3 text-3xl font-semibold text-copy-strong">{data.viewed.items.length}</p>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        title="Нещодавно переглянуте"
        description="Швидкий спосіб повернутися до товарів, які ви нещодавно переглядали."
        action={<Link href="/profile/wishlist" className="ui-link-muted">Переглянути обране</Link>}
      >
        {data.viewed.items.length === 0 ? (
          <EmptyState
            title="Поки що нічого не переглянуто"
            description="Переглядайте каталог, і тут з’являтимуться нещодавно переглянуті товари."
            actionHref="/catalog"
            actionLabel="Почати перегляд"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.viewed.items.slice(0, 4).map((item) => (
              <ProductCard
                key={item.id}
                id={item.productId}
                name={item.name}
                imageUrl={item.imageUrl ?? ''}
                product={{ price: item.price, sku: null, variants: [] }}
              />
            ))}
          </div>
        )}
      </DashboardCard>
    </ProfileSection>
  )
}
