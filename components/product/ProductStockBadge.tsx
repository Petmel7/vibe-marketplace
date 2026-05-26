import { getInventoryStatusChip } from './productInventory'
import type { ProductStockStatus } from '@/features/products/product.dto'

export default function ProductStockBadge({
  status,
}: {
  status: ProductStockStatus
}) {
  const inventoryChip = getInventoryStatusChip(status)

  if (!inventoryChip) {
    return null
  }

  if (!inventoryChip.dotClassName) {
    return <span className={inventoryChip.className}>{inventoryChip.label}</span>
  }

  return (
    <span className={inventoryChip.className}>
      <span className={inventoryChip.dotClassName} />
      {inventoryChip.label}
    </span>
  )
}
