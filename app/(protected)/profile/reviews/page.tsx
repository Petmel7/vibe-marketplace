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
  const reviewProducts = [...data.viewed.items, ...data.wishlist.items].slice(0, 8)

  return (
    <ProfileSection
      eyebrow="Reviews"
      title="Reviews & ratings"
      description="Leave marketplace reviews from product pages after purchase. The server validates purchase eligibility and moderation status."
    >
      <DashboardCard
        title="How reviews work"
        description="Verified purchase checks and publication status are enforced by the marketplace backend."
        action={<Link href="/profile/orders" className="ui-link-muted">Open orders</Link>}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-panel p-4 text-sm text-copy-secondary">
            <p className="font-semibold text-copy-strong">1. Buy the product</p>
            <p className="mt-2">Only confirmed marketplace purchases can submit a review.</p>
          </div>
          <div className="rounded-2xl bg-panel p-4 text-sm text-copy-secondary">
            <p className="font-semibold text-copy-strong">2. Review from the product page</p>
            <p className="mt-2">Ratings, title, comment, pros, and cons are submitted from the product details screen.</p>
          </div>
          <div className="rounded-2xl bg-panel p-4 text-sm text-copy-secondary">
            <p className="font-semibold text-copy-strong">3. Wait for moderation</p>
            <p className="mt-2">Published reviews appear publicly with the verified purchase label and seller replies.</p>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        title="Products to revisit"
        description="Quick links back to items you saved or viewed recently, so you can leave feedback directly from the product page."
      >
        {reviewProducts.length === 0 ? (
          <EmptyState
            title="No recent products yet"
            description="Browse the catalog or add products to wishlist, and they will appear here for quick review access."
            actionHref="/catalog"
            actionLabel="Open catalog"
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
