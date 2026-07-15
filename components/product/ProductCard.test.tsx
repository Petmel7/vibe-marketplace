// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { VisibleProductPromotionDto } from '@/features/promotions/promotions.dto'
import type { ReviewRatingSummaryDto } from '@/features/review/review.dto'

const { productCardAddToCartButtonMock } = vi.hoisted(() => ({
  productCardAddToCartButtonMock: vi.fn(),
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { alt, src } = props
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={String(alt ?? '')} src={String(src ?? '')} />
  },
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/wishlist/WishlistToggleButton', () => ({
  default: () => (
    <button type="button" aria-label="wishlist-button">
      wishlist
    </button>
  ),
}))

vi.mock('@/components/product/ProductCardAddToCartButton', () => ({
  default: (props: Record<string, unknown>) => {
    productCardAddToCartButtonMock(props)

    return (
      <button
        type="button"
        aria-label="add-to-cart-button"
        data-variant-id={String(props.variantId ?? '')}
        data-product-href={String(props.productHref ?? '')}
        data-requires-selection={String(Boolean(props.requiresVariantSelection))}
      >
        add-to-cart
      </button>
    )
  },
}))

vi.mock('@/components/product/ProductStockBadge', () => ({
  default: ({ status }: { status: string }) => <span>{status}</span>,
}))

import ProductCard from '@/components/product/ProductCard'

const baseProduct: {
  price: string
  sku: string
  inStock: boolean
  totalStock: number
  stockStatus: 'IN_STOCK'
  variants: Array<{
    id: string
    sku: string
    size: string | null
    color: string | null
    price: string | null
    stock: number
  }>
} = {
  price: '99.99',
  sku: 'SKU-001',
  inStock: true,
  totalStock: 10,
  stockStatus: 'IN_STOCK' as const,
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
}

const basePromotion: VisibleProductPromotionDto = {
  id: 'promo-1',
  name: 'Store 10%',
  code: 'STORE10',
  ownerType: 'SELLER',
  storeId: 'store-1',
  type: 'COUPON_CODE',
  discountType: 'PERCENTAGE',
  discountValue: '10.00',
  endsAt: '2026-07-31T00:00:00.000Z',
  targetType: 'PRODUCT',
  targetId: 'prod-1',
}

function renderProductCard(
  ratingSummary?: ReviewRatingSummaryDto,
  promotionSummary?: VisibleProductPromotionDto | null,
  product = baseProduct,
) {
  return renderToStaticMarkup(
    <ProductCard
      id="prod-1"
      name="Reviewed Product"
      imageUrl="https://example.com/product.jpg"
      storeName="Test Store"
      stockStatus="IN_STOCK"
      ratingSummary={ratingSummary}
      promotionSummary={promotionSummary}
      product={product}
    />,
  )
}

function renderProductCardDom(
  ratingSummary?: ReviewRatingSummaryDto,
  promotionSummary?: VisibleProductPromotionDto | null,
  product = baseProduct,
) {
  const container = document.createElement('div')
  container.innerHTML = renderProductCard(ratingSummary, promotionSummary, product)
  return container
}

describe('ProductCard', () => {
  it('renders average rating and count when a product has one review', () => {
    const markup = renderProductCard({
      averageRating: 3,
      totalCount: 1,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 1,
      rating4Count: 0,
      rating5Count: 0,
    })

    expect(markup).toContain('3.0')
    expect(markup).toContain('(1)')
  })

  it('renders average rating and count when a product has multiple reviews', () => {
    const markup = renderProductCard({
      averageRating: 4.8,
      totalCount: 27,
      rating1Count: 0,
      rating2Count: 1,
      rating3Count: 1,
      rating4Count: 5,
      rating5Count: 20,
    })

    expect(markup).toContain('4.8')
    expect(markup).toContain('(27)')
  })

  it('falls back to the existing no-reviews text when review count is zero', () => {
    const markup = renderProductCard({
      averageRating: 0,
      totalCount: 0,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 0,
      rating4Count: 0,
      rating5Count: 0,
    })

    expect(markup).toContain('Без відгуків')
  })

  it('keeps wishlist and add-to-cart buttons outside product detail links', () => {
    const container = renderProductCardDom({
      averageRating: 4.2,
      totalCount: 5,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 1,
      rating4Count: 2,
      rating5Count: 2,
    })

    const wishlistButton = container.querySelector('button[aria-label="wishlist-button"]')
    const addToCartButton = container.querySelector('button[aria-label="add-to-cart-button"]')
    const productLinks = container.querySelectorAll('a[href="/products/prod-1"]')

    expect(productLinks).toHaveLength(2)
    expect(wishlistButton?.closest('a')).toBeNull()
    expect(addToCartButton?.closest('a')).toBeNull()
  })

  it('renders an active promotion badge, discount, and code when provided', () => {
    const markup = renderProductCard(
      {
        averageRating: 4.2,
        totalCount: 5,
        rating1Count: 0,
        rating2Count: 0,
        rating3Count: 1,
        rating4Count: 2,
        rating5Count: 2,
      },
      basePromotion,
    )

    expect(markup).toContain('Акція')
    expect(markup).toContain('10.00%')
    expect(markup).toContain('STORE10')
  })

  it('passes the single purchasable variant for direct add-to-cart', () => {
    const container = renderProductCardDom(undefined, undefined, {
      ...baseProduct,
      variants: [
        {
          id: 'variant-1',
          sku: 'SKU-001',
          size: 'M',
          color: 'Black',
          price: '99.99',
          stock: 3,
        },
        {
          id: 'variant-2',
          sku: 'SKU-002',
          size: 'L',
          color: 'Black',
          price: '99.99',
          stock: 0,
        },
      ],
    })

    const addToCartButton = container.querySelector('button[aria-label="add-to-cart-button"]')

    expect(addToCartButton?.getAttribute('data-variant-id')).toBe('variant-1')
    expect(addToCartButton?.getAttribute('data-requires-selection')).toBe('false')
  })

  it('requires product details navigation when multiple purchasable variants exist', () => {
    const container = renderProductCardDom(undefined, undefined, {
      ...baseProduct,
      variants: [
        {
          id: 'variant-1',
          sku: 'SKU-001',
          size: 'M',
          color: 'Black',
          price: '99.99',
          stock: 3,
        },
        {
          id: 'variant-2',
          sku: 'SKU-002',
          size: 'L',
          color: 'Black',
          price: '99.99',
          stock: 2,
        },
      ],
    })

    const addToCartButton = container.querySelector('button[aria-label="add-to-cart-button"]')

    expect(addToCartButton?.getAttribute('data-variant-id')).toBe('')
    expect(addToCartButton?.getAttribute('data-product-href')).toBe('/products/prod-1')
    expect(addToCartButton?.getAttribute('data-requires-selection')).toBe('true')
  })
})
