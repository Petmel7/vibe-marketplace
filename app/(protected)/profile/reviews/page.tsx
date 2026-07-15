import Link from 'next/link'
import ProductCard from '@/components/product/ProductCard'
import DashboardCard from '@/components/profile/DashboardCard'
import EmptyState from '@/components/profile/EmptyState'
import ProfileSection from '@/components/profile/ProfileSection'
import { getCurrentUser } from '@/lib/session/getSession'
import { getProfileOverviewData } from '@/app/(protected)/profile/_lib/profile-dashboard.data'

export default async function ProfileReviewsPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getProfileOverviewData(user)
  const seenProductIds = new Set<string>()
  const reviewProducts = [...data.viewed.items, ...data.wishlist.items]
    .filter((item) => {
      if (seenProductIds.has(item.productId)) {
        return false
      }

      seenProductIds.add(item.productId)
      return true
    })
    .slice(0, 8)

  return (
    <ProfileSection
      eyebrow="Відгуки"
      title="Відгуки та оцінки"
      description="Залишайте відгуки зі сторінок товарів після покупки. Сервер перевіряє право на відгук і статус модерації."
    >
      <DashboardCard
        title="Як працюють відгуки"
        description="Перевірка підтвердженої покупки та статусу публікації контролюється backend-ом маркетплейсу."
        action={<Link href="/profile/orders" className="ui-link-muted">Відкрити замовлення</Link>}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-panel p-4 text-sm text-copy-secondary">
            <p className="font-semibold text-copy-strong">1. Купіть товар</p>
            <p className="mt-2">Лише підтверджені покупки на маркетплейсі можуть залишати відгук.</p>
          </div>
          <div className="rounded-2xl bg-panel p-4 text-sm text-copy-secondary">
            <p className="font-semibold text-copy-strong">2. Залиште відгук зі сторінки товару</p>
            <p className="mt-2">Оцінка, заголовок, коментар, переваги та недоліки надсилаються зі сторінки товару.</p>
          </div>
          <div className="rounded-2xl bg-panel p-4 text-sm text-copy-secondary">
            <p className="font-semibold text-copy-strong">3. Дочекайтеся модерації</p>
            <p className="mt-2">Опубліковані відгуки з’являються публічно з позначкою підтвердженої покупки та відповідями продавця.</p>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        title="Товари, до яких варто повернутися"
        description="Швидкі посилання на збережені або нещодавно переглянуті позиції, щоб ви могли залишити відгук прямо зі сторінки товару."
      >
        {reviewProducts.length === 0 ? (
          <EmptyState
            title="Нещодавніх товарів поки що немає"
            description="Переглядайте каталог або додавайте товари в обране, і вони з’являться тут для швидкого доступу до відгуків."
            actionHref="/catalog"
            actionLabel="Відкрити каталог"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {reviewProducts.map((item) => (
              <ProductCard
                key={`${item.productId}-${item.id}`}
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
