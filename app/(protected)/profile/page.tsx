import Link from 'next/link'
import ProductCard from '@/components/product/ProductCard'
import DashboardCard from '@/components/profile/DashboardCard'
import EmptyState from '@/components/profile/EmptyState'
import ProfileSection from '@/components/profile/ProfileSection'
import StatusBadge from '@/components/profile/StatusBadge'
import { getCurrentUser } from '@/lib/session/getSession'
import { formatPrice } from '@/utils/formatters/price'
import { getProfileOverviewData } from '@/app/(protected)/profile/_lib/profile-dashboard.data'

export default async function ProfileOverviewPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getProfileOverviewData(user)

  return (
    <ProfileSection
      eyebrow="Overview"
      title="Buyer dashboard"
      description="Track your orders, addresses, wishlist activity, and recently viewed items in one place."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <DashboardCard
          title="Profile summary"
          description="Core account details that will power future loyalty, support, and notification features."
          action={<Link href="/profile/settings" className="ui-link-muted">Edit profile</Link>}
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Display name</dt>
              <dd className="mt-2 text-sm text-copy-primary">
                {data.profile?.displayName || 'Add a display name in settings'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Buyer since</dt>
              <dd className="mt-2 text-sm text-copy-primary">
                {data.profile ? new Date(data.profile.createdAt).toLocaleDateString('uk-UA') : 'Unknown'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Phone</dt>
              <dd className="mt-2 text-sm text-copy-primary">
                {data.profile?.phoneNumber || 'Add a phone number to speed up checkout'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Email</dt>
              <dd className="mt-2 break-all text-sm text-copy-primary">{data.user.email}</dd>
            </div>
          </dl>
        </DashboardCard>

        <DashboardCard
          title="Wishlist summary"
          description="Saved products stay connected to your account across sessions."
          action={<Link href="/profile/wishlist" className="ui-link-muted">Open wishlist</Link>}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Saved items</p>
              <p className="mt-3 text-3xl font-semibold text-copy-strong">{data.wishlist.items.length}</p>
            </div>
            <div className="rounded-2xl bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Viewed products</p>
              <p className="mt-3 text-3xl font-semibold text-copy-strong">{data.viewed.items.length}</p>
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <DashboardCard
          title="Recent orders"
          description="A quick snapshot of your latest buyer activity."
          action={<Link href="/profile/orders" className="ui-link-muted">View all orders</Link>}
        >
          {data.recentOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="When your first order is placed, its status and totals will appear here."
              actionHref="/catalog"
              actionLabel="Explore catalog"
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
                        <p className="text-sm font-semibold text-copy-strong">Order #{order.id.slice(0, 8)}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-copy-muted">
                        {order.itemCount} items · {order.storeNames.join(', ')}
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
          title="Default shipping address"
          description="Your preferred destination for future orders."
          action={<Link href="/profile/addresses" className="ui-link-muted">Manage addresses</Link>}
        >
          {data.defaultAddress ? (
            <div className="space-y-2 text-sm text-copy-secondary">
              <p className="font-semibold text-copy-strong">{data.defaultAddress.fullName}</p>
              <p>{data.defaultAddress.phone}</p>
              <p>
                {data.defaultAddress.street}, {data.defaultAddress.building}
                {data.defaultAddress.apartment ? `, apt ${data.defaultAddress.apartment}` : ''}
              </p>
              <p>
                {data.defaultAddress.city}
                {data.defaultAddress.region ? `, ${data.defaultAddress.region}` : ''}, {data.defaultAddress.country}
              </p>
              <p>{data.addressCount} saved addresses total</p>
            </div>
          ) : (
            <EmptyState
              title="No default address"
              description="Save a shipping address to speed up checkout and delivery estimates."
              actionHref="/profile/addresses"
              actionLabel="Add address"
            />
          )}
        </DashboardCard>
      </div>

      <DashboardCard
        title="Reviews & ratings"
        description="Open the review hub to revisit products and leave verified buyer feedback from product pages."
        action={<Link href="/profile/reviews" className="ui-link-muted">Open review hub</Link>}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-panel p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Review hub</p>
            <p className="mt-3 text-3xl font-semibold text-copy-strong">
              {data.viewed.items.length > 0 ? 'Ready' : '—'}
            </p>
          </div>
          <div className="rounded-2xl bg-panel p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Wishlist items</p>
            <p className="mt-3 text-3xl font-semibold text-copy-strong">{data.wishlist.items.length}</p>
          </div>
          <div className="rounded-2xl bg-panel p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Recent products</p>
            <p className="mt-3 text-3xl font-semibold text-copy-strong">{data.viewed.items.length}</p>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        title="Recently viewed"
        description="A quick way back to products you explored recently."
        action={<Link href="/profile/wishlist" className="ui-link-muted">See saved items</Link>}
      >
        {data.viewed.items.length === 0 ? (
          <EmptyState
            title="Nothing viewed yet"
            description="Browse the catalog and recently viewed products will appear here."
            actionHref="/catalog"
            actionLabel="Start browsing"
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
