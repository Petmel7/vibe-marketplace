'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ProductStatusBadge from '@/components/seller/ProductStatusBadge'
import { createSellerProductSchema, updateSellerProductSchema } from '@/features/seller/products/seller-product.schema'
import { useSellerMutation } from '@/hooks/useSellerMutation'
import { canArchiveProduct, canSubmitProductForReview, type SellerProductStatus } from '@/types/seller'

type VariantState = {
  id?: string
  sku: string
  size: string
  color: string
  price: string
  stock: number
}

type ProductEditorValue = {
  id: string
  name: string
  description: string | null
  price: string
  imageUrl: string | null
  sku: string | null
  isHit: boolean
  isNew: boolean
  categoryId: string | null
  status: SellerProductStatus
  rejectionReason: string | null
  variants: Array<{
    id: string
    sku: string
    size: string | null
    color: string | null
    price: string | null
    stock: number
  }>
}

function createVariantState(): VariantState {
  return {
    sku: '',
    size: '',
    color: '',
    price: '',
    stock: 0,
  }
}

export default function SellerProductForm({
  mode,
  initialProduct,
}: {
  mode: 'create' | 'edit'
  initialProduct?: ProductEditorValue | null
}) {
  const router = useRouter()
  const { execute, isPending, errorMessage, setErrorMessage } = useSellerMutation()
  const [formState, setFormState] = useState({
    name: initialProduct?.name ?? '',
    description: initialProduct?.description ?? '',
    price: initialProduct?.price ?? '',
    imageUrl: initialProduct?.imageUrl ?? '',
    sku: initialProduct?.sku ?? '',
    categoryId: initialProduct?.categoryId ?? '',
    isHit: initialProduct?.isHit ?? false,
    isNew: initialProduct?.isNew ?? false,
  })
  const [createVariants, setCreateVariants] = useState<VariantState[]>(
    mode === 'create'
      ? initialProduct?.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          size: variant.size ?? '',
          color: variant.color ?? '',
          price: variant.price ?? '',
          stock: variant.stock,
        })) ?? [createVariantState()]
      : [],
  )
  const [editVariants, setEditVariants] = useState<VariantState[]>(
    initialProduct?.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size ?? '',
      color: variant.color ?? '',
      price: variant.price ?? '',
      stock: variant.stock,
    })) ?? [],
  )
  const [newVariant, setNewVariant] = useState<VariantState>(createVariantState())

  const submitBaseForm = async () => {
    setErrorMessage(null)

    if (mode === 'create') {
      const parsed = createSellerProductSchema.safeParse({
        name: formState.name,
        description: formState.description || null,
        price: formState.price,
        imageUrl: formState.imageUrl || null,
        sku: formState.sku || null,
        categoryId: formState.categoryId || null,
        isHit: formState.isHit,
        isNew: formState.isNew,
        variants: createVariants.map((variant) => ({
          sku: variant.sku || undefined,
          size: variant.size || null,
          color: variant.color || null,
          price: variant.price || null,
          stock: variant.stock,
        })),
      })

      if (!parsed.success) {
        setErrorMessage(parsed.error.issues[0]?.message ?? 'Please review the product fields.')
        return
      }

      const data = await execute<{ id: string }>({
        url: '/api/seller/products',
        method: 'POST',
        body: parsed.data,
        successMessage: 'Product draft created.',
        refresh: false,
      })

      if (data) {
        router.push(`/seller/products/${data.id}`)
      }

      return
    }

    if (!initialProduct) {
      return
    }

    const parsed = updateSellerProductSchema.safeParse({
      name: formState.name,
      description: formState.description || null,
      price: formState.price,
      imageUrl: formState.imageUrl || null,
      sku: formState.sku || null,
      categoryId: formState.categoryId || null,
      isHit: formState.isHit,
      isNew: formState.isNew,
    })

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Please review the product fields.')
      return
    }

    await execute({
      url: `/api/seller/products/${initialProduct.id}`,
      method: 'PATCH',
      body: parsed.data,
      successMessage: 'Product updated.',
    })
  }

  return (
    <div className="space-y-6">
      <section className="ui-elevated-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-copy-strong">
              {mode === 'create' ? 'New product draft' : 'Product details'}
            </h2>
            <p className="mt-1 text-sm text-copy-muted">
              Build a seller-facing product draft with moderation-ready metadata and variant setup.
            </p>
          </div>
          {initialProduct ? <ProductStatusBadge status={initialProduct.status} /> : null}
        </div>

        {initialProduct?.rejectionReason ? (
          <div className="mt-5 rounded-2xl border border-brand-danger/20 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
            {initialProduct.rejectionReason}
          </div>
        ) : null}

        <form
          className="mt-6 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            await submitBaseForm()
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="block text-sm font-medium text-copy-strong">Product name</span>
              <input
                className="ui-surface-input"
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="block text-sm font-medium text-copy-strong">Description</span>
              <textarea
                className="ui-surface-input min-h-32 resize-y"
                value={formState.description}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Base price</span>
              <input
                className="ui-surface-input"
                value={formState.price}
                onChange={(event) => setFormState((current) => ({ ...current, price: event.target.value }))}
                placeholder="1299.00"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Base SKU</span>
              <input
                className="ui-surface-input"
                value={formState.sku}
                onChange={(event) => setFormState((current) => ({ ...current, sku: event.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Category ID</span>
              <input
                className="ui-surface-input"
                value={formState.categoryId}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, categoryId: event.target.value }))
                }
                placeholder="Optional category UUID"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Image URL</span>
              <input
                className="ui-surface-input"
                value={formState.imageUrl}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, imageUrl: event.target.value }))
                }
                placeholder="https://example.com/product.jpg"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-wrap gap-4 rounded-2xl border border-panelBorder bg-panel px-4 py-4">
              <label className="inline-flex items-center gap-3 text-sm text-copy-primary">
                <input
                  type="checkbox"
                  checked={formState.isHit}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, isHit: event.target.checked }))
                  }
                />
                Mark as hit product
              </label>
              <label className="inline-flex items-center gap-3 text-sm text-copy-primary">
                <input
                  type="checkbox"
                  checked={formState.isNew}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, isNew: event.target.checked }))
                  }
                />
                Mark as new arrival
              </label>
            </div>
            <div className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Media preview</span>
              <div className="relative h-40 overflow-hidden rounded-3xl border border-dashed border-panelBorder bg-panel">
                {formState.imageUrl ? (
                  <Image src={formState.imageUrl} alt="Product preview" fill className="object-cover" sizes="320px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-copy-muted">
                    Upload/media integration placeholder
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" className="ui-primary-button" disabled={isPending}>
              {isPending ? 'Saving...' : mode === 'create' ? 'Create draft' : 'Save product'}
            </button>

            {mode === 'edit' && initialProduct && canSubmitProductForReview(initialProduct.status) ? (
              <button
                type="button"
                className="ui-secondary-button"
                disabled={isPending}
                onClick={() =>
                  execute({
                    url: `/api/seller/products/${initialProduct.id}/submit`,
                    successMessage: 'Product submitted for review.',
                  })
                }
              >
                Submit for review
              </button>
            ) : null}

            {mode === 'edit' && initialProduct && canArchiveProduct(initialProduct.status) ? (
              <button
                type="button"
                className="ui-secondary-button"
                disabled={isPending}
                onClick={() =>
                  execute({
                    url: `/api/seller/products/${initialProduct.id}/archive`,
                    successMessage: 'Product archived.',
                  })
                }
              >
                Archive product
              </button>
            ) : null}
          </div>
        </form>

        {errorMessage ? <p className="mt-4 text-sm text-brand-danger">{errorMessage}</p> : null}
      </section>

      {mode === 'create' ? (
        <section className="ui-elevated-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-copy-strong">Initial variants</h2>
              <p className="mt-1 text-sm text-copy-muted">
                Seed the first size, color, SKU, and stock combinations for this product draft.
              </p>
            </div>
            <button
              type="button"
              className="ui-secondary-button"
              onClick={() => setCreateVariants((current) => [...current, createVariantState()])}
            >
              Add variant
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {createVariants.map((variant, index) => (
              <div key={index} className="grid gap-4 rounded-2xl border border-panelBorder bg-panel px-4 py-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ['sku', 'SKU'],
                  ['size', 'Size'],
                  ['color', 'Color'],
                  ['price', 'Variant price'],
                ].map(([field, label]) => (
                  <label key={field} className="space-y-2">
                    <span className="block text-sm font-medium text-copy-strong">{label}</span>
                    <input
                      className="ui-surface-input"
                      value={variant[field as keyof VariantState] as string}
                      onChange={(event) =>
                        setCreateVariants((current) =>
                          current.map((currentVariant, currentIndex) =>
                            currentIndex === index
                              ? { ...currentVariant, [field]: event.target.value }
                              : currentVariant,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                <label className="space-y-2">
                  <span className="block text-sm font-medium text-copy-strong">Stock</span>
                  <input
                    type="number"
                    min={0}
                    className="ui-surface-input"
                    value={variant.stock}
                    onChange={(event) =>
                      setCreateVariants((current) =>
                        current.map((currentVariant, currentIndex) =>
                          currentIndex === index
                            ? { ...currentVariant, stock: Number(event.target.value) }
                            : currentVariant,
                        ),
                      )
                    }
                  />
                </label>
                <div className="sm:col-span-2 xl:col-span-5">
                  <button
                    type="button"
                    className="rounded-full border border-brand-danger/30 px-4 py-2 text-sm text-brand-danger transition-colors hover:bg-brand-danger/10"
                    onClick={() =>
                      setCreateVariants((current) =>
                        current.length > 1 ? current.filter((_, currentIndex) => currentIndex !== index) : current,
                      )
                    }
                  >
                    Remove variant
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : initialProduct ? (
        <section className="ui-elevated-panel p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-copy-strong">Variants</h2>
              <p className="mt-1 text-sm text-copy-muted">
                Manage SKU-level option details and keep inventory metadata aligned with fulfillment workflows.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {editVariants.map((variant) => (
              <div key={variant.id} className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {[
                    ['sku', 'SKU'],
                    ['size', 'Size'],
                    ['color', 'Color'],
                    ['price', 'Variant price'],
                  ].map(([field, label]) => (
                    <label key={field} className="space-y-2">
                      <span className="block text-sm font-medium text-copy-strong">{label}</span>
                      <input
                        className="ui-surface-input"
                        value={variant[field as keyof VariantState] as string}
                        onChange={(event) =>
                          setEditVariants((current) =>
                            current.map((currentVariant) =>
                              currentVariant.id === variant.id
                                ? { ...currentVariant, [field]: event.target.value }
                                : currentVariant,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-copy-strong">Stock</span>
                    <input
                      type="number"
                      min={0}
                      className="ui-surface-input"
                      value={variant.stock}
                      onChange={(event) =>
                        setEditVariants((current) =>
                          current.map((currentVariant) =>
                            currentVariant.id === variant.id
                              ? { ...currentVariant, stock: Number(event.target.value) }
                              : currentVariant,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="ui-secondary-button h-10 px-4 py-2 text-sm"
                    disabled={isPending}
                    onClick={() =>
                      execute({
                        url: `/api/seller/products/${initialProduct.id}/variants/${variant.id}`,
                        method: 'PATCH',
                        body: {
                          sku: variant.sku || undefined,
                          size: variant.size || null,
                          color: variant.color || null,
                          price: variant.price || null,
                          stock: variant.stock,
                        },
                        successMessage: 'Variant updated.',
                      })
                    }
                  >
                    Save variant
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-brand-danger/30 px-4 py-2 text-sm text-brand-danger transition-colors hover:bg-brand-danger/10"
                    disabled={isPending}
                    onClick={() =>
                      execute<null>({
                        url: `/api/seller/products/${initialProduct.id}/variants/${variant.id}`,
                        method: 'DELETE',
                        successMessage: 'Variant removed.',
                        onSuccess: () => {
                          setEditVariants((current) =>
                            current.filter((currentVariant) => currentVariant.id !== variant.id),
                          )
                        },
                      })
                    }
                  >
                    Remove variant
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <h3 className="text-base font-semibold text-copy-strong">Add variant</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['sku', 'SKU'],
                ['size', 'Size'],
                ['color', 'Color'],
                ['price', 'Variant price'],
              ].map(([field, label]) => (
                <label key={field} className="space-y-2">
                  <span className="block text-sm font-medium text-copy-strong">{label}</span>
                  <input
                    className="ui-surface-input"
                    value={newVariant[field as keyof VariantState] as string}
                    onChange={(event) =>
                      setNewVariant((current) => ({ ...current, [field]: event.target.value }))
                    }
                  />
                </label>
              ))}
              <label className="space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Stock</span>
                <input
                  type="number"
                  min={0}
                  className="ui-surface-input"
                  value={newVariant.stock}
                  onChange={(event) =>
                    setNewVariant((current) => ({ ...current, stock: Number(event.target.value) }))
                  }
                />
              </label>
            </div>
            <button
              type="button"
              className="ui-secondary-button mt-4"
              disabled={isPending}
              onClick={async () => {
                const data = await execute<{
                  id: string
                  sku: string
                  size: string | null
                  color: string | null
                  price: string | null
                  stock: number
                }>({
                  url: `/api/seller/products/${initialProduct.id}/variants`,
                  method: 'POST',
                  body: {
                    sku: newVariant.sku || undefined,
                    size: newVariant.size || null,
                    color: newVariant.color || null,
                    price: newVariant.price || null,
                    stock: newVariant.stock,
                  },
                  successMessage: 'Variant added.',
                })

                if (data) {
                  setEditVariants((current) => [
                    ...current,
                    {
                      id: data.id,
                      sku: data.sku,
                      size: data.size ?? '',
                      color: data.color ?? '',
                      price: data.price ?? '',
                      stock: data.stock,
                    },
                  ])
                  setNewVariant(createVariantState())
                }
              }}
            >
              Add variant
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
