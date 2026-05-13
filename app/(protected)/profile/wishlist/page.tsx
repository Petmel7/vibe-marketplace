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
      eyebrow="Wishlist"
      title="Saved products"
      description="Your buyer wishlist is rendered from the authenticated server session and reuses existing product card behavior."
    >
      {wishlist.items.length === 0 ? (
        <EmptyState
          title="Your wishlist is empty"
          description="Save products while browsing and they will appear here for quick access later."
          actionHref="/catalog"
          actionLabel="Explore catalog"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {wishlist.items.map((item) => (
            <ProductCard
              key={item.id}
              id={item.productId}
              name={item.name}
              imageUrl={item.imageUrl ?? '/logo.svg'}
              product={{ price: item.price, sku: null, variants: [] }}
            />
          ))}
        </div>
      )}
    </ProfileSection>
  )
}
