// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  addToCartButtonMock,
  productVariantSelectorMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  addToCartButtonMock: vi.fn(),
  productVariantSelectorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode
    href: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('lucide-react', () => ({
  Share2: () => <span>share-icon</span>,
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock('@/components/product/ProductVariantSelector', () => ({
  default: ({
    selectedVariantId,
    variants,
    onSelect,
  }: {
    selectedVariantId: string | null
    variants: Array<{ id: string; size: string | null }>
    onSelect: (variantId: string) => void
  }) => {
    productVariantSelectorMock({ selectedVariantId, variants })

    return (
      <div>
        <span data-testid="selected-variant">{selectedVariantId ?? 'none'}</span>
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => onSelect(variant.id)}
          >
            {variant.size ?? variant.id}
          </button>
        ))}
      </div>
    )
  },
}))

vi.mock('@/components/wishlist/WishlistToggleButton', () => ({
  default: () => <button type="button">wishlist</button>,
}))

vi.mock('@/components/product/ProductQuantitySelector', () => ({
  default: () => <div>quantity-selector</div>,
}))

vi.mock('@/components/cart/AddToCartButton', () => ({
  default: ({ variantId, disabled }: { variantId: string | null; disabled?: boolean }) => {
    addToCartButtonMock({ variantId, disabled })
    return (
      <button
        type="button"
        data-testid="add-to-cart"
        data-variant-id={variantId ?? ''}
        data-disabled={String(Boolean(disabled || !variantId))}
      >
        add-to-cart
      </button>
    )
  },
}))

vi.mock('@/components/product/ProductDescription', () => ({
  default: () => <div>description</div>,
}))

vi.mock('@/components/product/ProductCharacteristics', () => ({
  default: () => <div>characteristics</div>,
}))

vi.mock('@/components/product/ProductInfoSection', () => ({
  default: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}))

vi.mock('@/components/product/ProductPurchasePanel', () => ({
  default: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}))

vi.mock('@/components/product/ProductStockBadge', () => ({
  default: ({ status }: { status: string }) => <span>{status}</span>,
}))

vi.mock('@/components/abuse-reports/ReportButton', () => ({
  default: () => <button type="button">report</button>,
}))

vi.mock('@/components/product/productBadges', () => ({
  resolveProductBadgeChips: () => [],
}))

vi.mock('@/components/viewed/hooks/useRecordViewedProduct', () => ({
  useRecordViewedProduct: vi.fn(),
}))

import ProductDetails from '@/components/product/ProductDetails'

const product = {
  id: 'prod-1',
  storeId: 'store-1',
  href: '/products/prod-1',
  name: 'Reviewed Product',
  description: 'Description',
  price: '99.99',
  imageUrl: 'https://example.com/product.jpg',
  isActive: true,
  inStock: true,
  totalStock: 10,
  stockStatus: 'IN_STOCK' as const,
  sku: 'SKU-001',
  isHit: false,
  isNew: false,
  badgeContext: 'DEFAULT' as const,
  badges: [],
  ratingSummary: {
    averageRating: 4.5,
    totalCount: 7,
    rating1Count: 0,
    rating2Count: 0,
    rating3Count: 1,
    rating4Count: 2,
    rating5Count: 4,
  },
  promotionSummary: {
    id: 'promo-1',
    name: 'Store 10%',
    code: 'STORE10',
    ownerType: 'SELLER' as const,
    storeId: 'store-1',
    type: 'COUPON_CODE' as const,
    discountType: 'PERCENTAGE' as const,
    discountValue: '10.00',
    endsAt: '2026-07-31T00:00:00.000Z',
    targetType: 'PRODUCT' as const,
    targetId: 'prod-1',
  },
  createdAt: '2026-06-01T00:00:00.000Z',
  variants: [
    {
      id: 'variant-1',
      sku: 'SKU-001',
      size: null,
      color: null,
      price: null,
      stock: 10,
    },
  ],
  images: [],
  storeName: 'Test Store',
  storeSlug: 'test-store',
  categoryName: 'Outerwear',
  categorySlug: 'outerwear',
}

describe('ProductDetails', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot> | null

  beforeEach(() => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount()
      })
    }
    container.remove()
  })

  it('renders the promotion block with name, code, and discount summary', () => {
    const markup = renderToStaticMarkup(
      <ProductDetails product={product} currentUser={null} />,
    )

    expect(markup).toContain('Акція')
    expect(markup).toContain('Store 10%')
    expect(markup).toContain('Промокод: STORE10')
    expect(markup).toContain('Знижка: 10.00%')
  })

  it('selects the first in-stock variant by default for products with multiple purchasable variants', () => {
    act(() => {
      root!.render(
        <ProductDetails
          currentUser={null}
          product={{
            ...product,
            variants: [
              {
                id: 'variant-1',
                sku: 'SKU-001',
                size: 'M',
                color: 'Black',
                price: '99.99',
                stock: 2,
              },
              {
                id: 'variant-2',
                sku: 'SKU-002',
                size: 'L',
                color: 'Black',
                price: '109.99',
                stock: 3,
              },
            ],
          }}
        />,
      )
    })

    const addToCartButton = container.querySelector('[data-testid="add-to-cart"]')
    const selectedVariant = container.querySelector('[data-testid="selected-variant"]')

    expect(selectedVariant?.textContent).toBe('variant-1')
    expect(addToCartButton?.getAttribute('data-variant-id')).toBe('variant-1')
    expect(addToCartButton?.getAttribute('data-disabled')).toBe('false')
  })

  it('auto-selects the only purchasable variant for single-variant products', () => {
    act(() => {
      root!.render(<ProductDetails product={product} currentUser={null} />)
    })

    const addToCartButton = container.querySelector('[data-testid="add-to-cart"]')
    const selectedVariant = container.querySelector('[data-testid="selected-variant"]')

    expect(selectedVariant?.textContent).toBe('variant-1')
    expect(addToCartButton?.getAttribute('data-variant-id')).toBe('variant-1')
    expect(addToCartButton?.getAttribute('data-disabled')).toBe('false')
  })

  it('skips an out-of-stock first variant and selects the first purchasable size', () => {
    act(() => {
      root!.render(
        <ProductDetails
          currentUser={null}
          product={{
            ...product,
            variants: [
              {
                id: 'variant-1',
                sku: 'SKU-001',
                size: 'M',
                color: 'Black',
                price: '99.99',
                stock: 0,
              },
              {
                id: 'variant-2',
                sku: 'SKU-002',
                size: 'L',
                color: 'Black',
                price: '109.99',
                stock: 3,
              },
            ],
          }}
        />,
      )
    })

    const addToCartButton = container.querySelector('[data-testid="add-to-cart"]')
    const selectedVariant = container.querySelector('[data-testid="selected-variant"]')

    expect(selectedVariant?.textContent).toBe('variant-2')
    expect(addToCartButton?.getAttribute('data-variant-id')).toBe('variant-2')
    expect(addToCartButton?.getAttribute('data-disabled')).toBe('false')
  })

  it('keeps add-to-cart disabled when all variants are out of stock', () => {
    act(() => {
      root!.render(
        <ProductDetails
          currentUser={null}
          product={{
            ...product,
            variants: [
              {
                id: 'variant-1',
                sku: 'SKU-001',
                size: 'M',
                color: 'Black',
                price: '99.99',
                stock: 0,
              },
              {
                id: 'variant-2',
                sku: 'SKU-002',
                size: 'L',
                color: 'Black',
                price: '109.99',
                stock: 0,
              },
            ],
          }}
        />,
      )
    })

    const addToCartButton = container.querySelector('[data-testid="add-to-cart"]')
    const selectedVariant = container.querySelector('[data-testid="selected-variant"]')

    expect(selectedVariant?.textContent).toBe('none')
    expect(addToCartButton?.getAttribute('data-variant-id')).toBe('')
    expect(addToCartButton?.getAttribute('data-disabled')).toBe('true')
  })

  it('preserves explicit user selection on multi-variant products', async () => {
    act(() => {
      root!.render(
        <ProductDetails
          currentUser={null}
          product={{
            ...product,
            variants: [
              {
                id: 'variant-1',
                sku: 'SKU-001',
                size: 'M',
                color: 'Black',
                price: '99.99',
                stock: 2,
              },
              {
                id: 'variant-2',
                sku: 'SKU-002',
                size: 'L',
                color: 'Black',
                price: '109.99',
                stock: 3,
              },
            ],
          }}
        />,
      )
    })

    const selectLargeButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'L',
    )

    await act(async () => {
      selectLargeButton?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      )
      await Promise.resolve()
    })

    const addToCartButton = container.querySelector('[data-testid="add-to-cart"]')
    const selectedVariant = container.querySelector('[data-testid="selected-variant"]')

    expect(selectedVariant?.textContent).toBe('variant-2')
    expect(addToCartButton?.getAttribute('data-variant-id')).toBe('variant-2')
    expect(addToCartButton?.getAttribute('data-disabled')).toBe('false')
  })

  it('falls back to the first purchasable variant when the selected size becomes unavailable after product data changes', async () => {
    act(() => {
      root!.render(
        <ProductDetails
          currentUser={null}
          product={{
            ...product,
            variants: [
              {
                id: 'variant-1',
                sku: 'SKU-001',
                size: 'M',
                color: 'Black',
                price: '99.99',
                stock: 2,
              },
              {
                id: 'variant-2',
                sku: 'SKU-002',
                size: 'L',
                color: 'Black',
                price: '109.99',
                stock: 3,
              },
            ],
          }}
        />,
      )
    })

    const selectLargeButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'L',
    )

    await act(async () => {
      selectLargeButton?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      )
      await Promise.resolve()
    })

    act(() => {
      root!.render(
        <ProductDetails
          currentUser={null}
          product={{
            ...product,
            variants: [
              {
                id: 'variant-1',
                sku: 'SKU-001',
                size: 'M',
                color: 'Black',
                price: '99.99',
                stock: 2,
              },
              {
                id: 'variant-2',
                sku: 'SKU-002',
                size: 'L',
                color: 'Black',
                price: '109.99',
                stock: 0,
              },
            ],
          }}
        />,
      )
    })

    const addToCartButton = container.querySelector('[data-testid="add-to-cart"]')
    const selectedVariant = container.querySelector('[data-testid="selected-variant"]')

    expect(selectedVariant?.textContent).toBe('variant-1')
    expect(addToCartButton?.getAttribute('data-variant-id')).toBe('variant-1')
    expect(addToCartButton?.getAttribute('data-disabled')).toBe('false')
  })
})
