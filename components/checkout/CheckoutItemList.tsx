import DashboardCard from '@/components/profile/DashboardCard'
import type { CheckoutPreviewItem } from '@/types/checkout'
import CheckoutItemCard from './CheckoutItemCard'

export default function CheckoutItemList({
  items,
}: {
  items: CheckoutPreviewItem[]
}) {
  return (
    <DashboardCard
      title="Order review"
      description="Server-validated items, quantities, pricing, and inventory states before order creation."
    >
      <div className="space-y-4">
        {items.map((item) => (
          <CheckoutItemCard key={item.id} item={item} />
        ))}
      </div>
    </DashboardCard>
  )
}
