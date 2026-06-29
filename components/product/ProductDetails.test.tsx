// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@/components/product/ProductVariantSelector', () => ({
  default: () => <div>variant-selector</div>,
}))

vi.mock('@/components/wishlist/WishlistToggleButton', () => ({
  default: () => <button type="button">wishlist</button>,
}))

vi.mock('@/components/product/ProductQuantitySelector', () => ({
  default: () => <div>quantity-selector</div>,
}))

vi.mock('@/components/cart/AddToCartButton', () => ({
  default: () => <button type="button">add-to-cart</button>,
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
  it('renders the promotion block with name, code, and discount summary', () => {
    const markup = renderToStaticMarkup(
      <ProductDetails product={product} currentUser={null} />,
    )

    expect(markup).toContain('Акція')
    expect(markup).toContain('Store 10%')
    expect(markup).toContain('Промокод: STORE10')
    expect(markup).toContain('Знижка: 10.00%')
  })
})
