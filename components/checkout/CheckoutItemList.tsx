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
      title="Огляд замовлення"
      description="Товари, кількість, ціни та статуси залишків перевіряються сервером перед створенням замовлення."
    >
      <div className="space-y-4">
        {items.map((item) => (
          <CheckoutItemCard key={item.id} item={item} />
        ))}
      </div>
    </DashboardCard>
  )
}
