import Image from 'next/image'
import { getInventoryStatusChip } from '@/components/product/productInventory'
import type { CheckoutPreviewItem } from '@/types/checkout'
import { formatPrice } from '@/utils/formatters/price'

export default function CheckoutItemCard({
  item,
}: {
  item: CheckoutPreviewItem & { storeName?: string }
}) {
  const inventoryChip = getInventoryStatusChip(item.stockStatus)

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-panelBorder bg-panel px-4 py-4 sm:flex-row sm:items-start">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-panelBorder">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.productName}
            fill
            className="object-contain p-2"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-copy-muted">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-copy-strong">{item.productName}</h3>
            <p className="text-sm text-copy-muted">{item.variantLabel ?? 'Standard option'}</p>
            {item.storeName ? <p className="text-sm text-copy-muted">{item.storeName}</p> : null}
          </div>
          <p className="text-base font-semibold text-copy-strong">{formatPrice(item.lineTotal)}</p>
        </div>

        <dl className="grid gap-2 text-sm text-copy-secondary sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-copy-muted">Unit price</dt>
            <dd className="mt-1 text-copy-primary">{formatPrice(item.unitPrice)}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Quantity</dt>
            <dd className="mt-1 text-copy-primary">{item.quantity}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Available stock</dt>
            <dd className="mt-1 text-copy-primary">{item.availableStock}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Stock state</dt>
            <dd className="mt-1">
              {inventoryChip?.dotClassName ? (
                <span className={inventoryChip.className}>
                  <span className={inventoryChip.dotClassName} />
                  {inventoryChip.label}
                </span>
              ) : inventoryChip ? (
                <span className={inventoryChip.className}>{inventoryChip.label}</span>
              ) : (
                <span className="text-copy-muted">Unknown</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  )
}
