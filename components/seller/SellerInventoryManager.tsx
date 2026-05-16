'use client'

import { useState } from 'react'
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
        const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0)

        return (
          <section key={product.id} className="ui-elevated-panel p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-copy-strong">{product.name}</h2>
                  <ProductStatusBadge status={product.status} />
                </div>
                <p className="mt-2 text-sm text-copy-muted">
                  {product.sku ? `Base SKU: ${product.sku} · ` : ''}
                  {totalStock} units across {product.variants.length} variants
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {product.variants.map((variant) => {
                const isLowStock = draftStocks[variant.id] <= 5

                return (
                  <div
                    key={variant.id}
                    className="flex flex-col gap-4 rounded-2xl border border-panelBorder bg-panel px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-copy-strong">{variant.sku}</p>
                      <p className="text-sm text-copy-secondary">
                        {[variant.size, variant.color].filter(Boolean).join(' · ') || 'Single option'}
                      </p>
                      {isLowStock ? (
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-200">
                          Low stock
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <label className="space-y-2">
                        <span className="block text-xs uppercase tracking-[0.16em] text-copy-muted">Stock</span>
                        <input
                          type="number"
                          min={0}
                          className="ui-surface-input w-28"
                          value={draftStocks[variant.id] ?? 0}
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
                        className="ui-secondary-button h-10 px-4 py-2 text-sm"
                        disabled={
                          isReadOnly ||
                          isPending ||
                          draftStocks[variant.id] === variant.stock
                        }
                        onClick={async () => {
                          const nextStock = draftStocks[variant.id] ?? 0
                          const data = await execute<{ stock: number }>({
                            url: `/api/seller/products/${product.id}/variants/${variant.id}/inventory`,
                            method: 'PATCH',
                            body: { stock: nextStock },
                            successMessage: 'Inventory updated.',
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
                        Save
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
