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
    <article className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
      <div className="flex flex-col gap-4 min-[501px]:grid min-[501px]:grid-cols-[96px_minmax(0,1fr)] min-[501px]:items-start min-[501px]:gap-x-4 min-[501px]:gap-y-3 min-[641px]:flex min-[641px]:flex-row min-[641px]:items-start">
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
              Немає фото
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3 min-[501px]:space-y-3 min-[501px]:self-start">
          <div className="flex flex-col gap-3 min-[641px]:flex-row min-[641px]:items-start min-[641px]:justify-between">
            <div className="min-w-0 space-y-1">
              <h3 className="text-base font-semibold text-copy-strong">{item.productName}</h3>
              <p className="text-sm text-copy-muted">{item.variantLabel ?? 'Стандартний варіант'}</p>
              {item.storeName ? <p className="text-sm text-copy-muted">{item.storeName}</p> : null}
            </div>
            <div className="space-y-1 text-left min-[641px]:text-right">
              <p className="text-base font-semibold text-copy-strong">{formatPrice(item.lineTotal)}</p>
              <p className="text-xs text-copy-muted">
                {formatPrice(item.unitPrice)} за {item.quantity} шт.
              </p>
            </div>
          </div>

          <dl className="grid gap-2 text-sm text-copy-secondary min-[641px]:grid-cols-2 xl:grid-cols-4">
            <div className="min-[501px]:col-span-2 min-[641px]:col-span-1">
              <dt className="text-copy-muted">Артикул</dt>
              <dd className="mt-1 break-words text-copy-primary">{item.sku ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-copy-muted">Ціна за одиницю</dt>
              <dd className="mt-1 text-copy-primary">{formatPrice(item.unitPrice)}</dd>
            </div>
            <div>
              <dt className="text-copy-muted">Кількість</dt>
              <dd className="mt-1 text-copy-primary">{item.quantity}</dd>
            </div>
          </dl>

          <dl className="grid gap-2 text-sm text-copy-secondary min-[501px]:col-span-2 min-[501px]:grid-cols-2 min-[641px]:grid-cols-2 xl:grid-cols-2">
            <div>
              <dt className="text-copy-muted">Доступний залишок</dt>
              <dd className="mt-1 text-copy-primary">{item.availableStock}</dd>
            </div>
            <div>
              <dt className="text-copy-muted">Статус залишку</dt>
              <dd className="mt-1">
                {inventoryChip?.dotClassName ? (
                  <span className={inventoryChip.className}>
                    <span className={inventoryChip.dotClassName} />
                    {inventoryChip.label}
                  </span>
                ) : inventoryChip ? (
                  <span className={inventoryChip.className}>{inventoryChip.label}</span>
                ) : (
                  <span className="text-copy-muted">Невідомо</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  )
}
