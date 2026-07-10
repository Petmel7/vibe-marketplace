import ProfileSection from '@/components/profile/ProfileSection'
import EmptyState from '@/components/profile/EmptyState'
import ProductCard from '@/components/product/ProductCard'
import { getCurrentUser } from '@/lib/session/getSession'
import { getWishlistPageData } from '@/app/(protected)/profile/_lib/profile-dashboard.data'

export default async function ProfileWishlistPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const wishlist = await getWishlistPageData(user)

  return (
    <ProfileSection
      eyebrow="Обране"
      title="Збережені товари"
      description="Ваше обране покупця рендериться з автентифікованої серверної сесії та використовує наявну поведінку карток товарів."
    >
      {wishlist.items.length === 0 ? (
        <EmptyState
          title="Ваше обране порожнє"
          description="Зберігайте товари під час перегляду, і вони з’являться тут для швидкого доступу."
          actionHref="/catalog"
          actionLabel="Перейти до каталогу"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {wishlist.items.map((item) => (
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
    </ProfileSection>
  )
}
