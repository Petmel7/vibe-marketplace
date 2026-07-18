'use client'

import { useState } from 'react'
import { deriveInventoryStatusFromVariants, getInventoryStatusChip } from '@/components/product/productInventory'
import ProductStatusBadge from '@/components/seller/ProductStatusBadge'
import { useSellerMutation } from '@/hooks/useSellerMutation'
import type { SellerProductStatus } from '@/types/seller'

type InventoryProduct = {
  id: string
  name: string
  sku: string | null
  status: SellerProductStatus
  variants: Array<{
    id: string
    sku: string
    size: string | null
    color: string | null
    stock: number
  }>
}

export default function SellerInventoryManager({
  initialProducts,
  isReadOnly,
}: {
  initialProducts: InventoryProduct[]
  isReadOnly?: boolean
}) {
  const { execute, isPending, errorMessage } = useSellerMutation()
  const [products, setProducts] = useState(initialProducts)
  const [draftStocks, setDraftStocks] = useState<Record<string, number>>(
    Object.fromEntries(
      initialProducts.flatMap((product) =>
        product.variants.map((variant) => [variant.id, variant.stock]),
      ),
    ),
  )

  return (
    <div className="space-y-5">
      {errorMessage ? (
        <div className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
          {errorMessage}
        </div>
      ) : null}

      {products.map((product) => {
        const inventoryState = deriveInventoryStatusFromVariants(product.variants)
        const inventoryChip = getInventoryStatusChip(inventoryState.stockStatus)

        return (
          <section key={product.id} className="ui-elevated-panel p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-copy-strong">{product.name}</h2>
                  <ProductStatusBadge status={product.status} />
                  {inventoryChip ? (
                    inventoryChip.dotClassName ? (
                      <span className={inventoryChip.className}>
                        <span className={inventoryChip.dotClassName} />
                        {inventoryChip.label}
                      </span>
                    ) : (
                      <span className={inventoryChip.className}>{inventoryChip.label}</span>
                    )
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-copy-muted">
                  {product.sku ? `Базовий SKU: ${product.sku} · ` : ''}
                  {inventoryState.totalStock} одиниць у {product.variants.length} варіанті
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {product.variants.map((variant) => {
                const nextStock = draftStocks[variant.id] ?? 0
                const variantInventoryChip = getInventoryStatusChip(
                  nextStock <= 0 ? 'OUT_OF_STOCK' : nextStock <= 3 ? 'LOW_STOCK' : 'IN_STOCK',
                )

                return (
                  <div
                    key={variant.id}
                    className="flex flex-col gap-4 rounded-2xl border border-panelBorder bg-panel px-4 py-4 min-[501px]:max-[1025px]:grid min-[501px]:max-[1025px]:grid-cols-[minmax(0,1fr)_auto] min-[501px]:max-[1025px]:items-start min-[501px]:max-[1025px]:gap-x-5 min-[1026px]:flex-row min-[1026px]:items-center min-[1026px]:justify-between"
                  >
                    <div className="min-w-0 space-y-2">
                      <p className="break-words text-sm font-semibold text-copy-strong">{variant.sku}</p>
                      <p className="text-sm text-copy-secondary">
                        {[variant.size, variant.color].filter(Boolean).join(' · ') || 'Єдиний варіант'}
                      </p>
                      {variantInventoryChip ? (
                        variantInventoryChip.dotClassName ? (
                          <span className={`${variantInventoryChip.className} inline-flex`}>
                            <span className={variantInventoryChip.dotClassName} />
                            {variantInventoryChip.label}
                          </span>
                        ) : (
                          <span className={`${variantInventoryChip.className} inline-flex`}>
                            {variantInventoryChip.label}
                          </span>
                        )
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 min-[501px]:max-[1025px]:items-center min-[501px]:max-[1025px]:justify-center min-[1026px]:flex-row min-[1026px]:items-center">
                      <label className="space-y-2 max-[500px]:w-full">
                        <span className="block text-xs uppercase tracking-[0.16em] text-copy-muted">Залишок</span>
                        <input
                          type="number"
                          min={0}
                          className="ui-surface-input h-10 w-28 max-[500px]:w-full"
                          value={nextStock}
                          onChange={(event) =>
                            setDraftStocks((current) => ({
                              ...current,
                              [variant.id]: Number(event.target.value),
                            }))
                          }
                          disabled={isReadOnly || isPending}
                        />
                      </label>
                      <button
                        type="button"
                        className="ui-secondary-button h-10 px-4 py-2 text-sm max-[500px]:w-full"
                        disabled={isReadOnly || isPending || nextStock === variant.stock}
                        onClick={async () => {
                          const data = await execute<{ stock: number }>({
                            url: `/api/seller/products/${product.id}/variants/${variant.id}/inventory`,
                            method: 'PATCH',
                            body: { stock: nextStock },
                            successMessage: 'Залишки оновлено.',
                          })

                          if (!data) {
                            return
                          }

                          setProducts((current) =>
                            current.map((currentProduct) =>
                              currentProduct.id === product.id
                                ? {
                                    ...currentProduct,
                                    variants: currentProduct.variants.map((currentVariant) =>
                                      currentVariant.id === variant.id
                                        ? { ...currentVariant, stock: nextStock }
                                        : currentVariant,
                                    ),
                                  }
                                : currentProduct,
                            ),
                          )
                        }}
                      >
                        Зберегти
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
