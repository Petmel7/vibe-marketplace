// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { shareMock, writeTextMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  shareMock: vi.fn(),
  writeTextMock: vi.fn(),
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
  promotionSummary: null,
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

describe('ProductDetails share action', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot> | null

  beforeEach(() => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    window.history.replaceState({}, '', '/products/prod-1')

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: shareMock,
    })

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock,
      },
    })
  })

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount()
      })
    }
    container.remove()
  })

  it('uses the native share flow when the browser supports it', async () => {
    shareMock.mockResolvedValue(undefined)

    act(() => {
      root!.render(<ProductDetails product={product} currentUser={null} />)
    })

    const button = container.querySelector('button[aria-label="Поділитися"]')

    await act(async () => {
      button?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      )
      await Promise.resolve()
    })

    expect(shareMock).toHaveBeenCalledWith({
      title: 'Reviewed Product',
      url: 'http://localhost:3000/products/prod-1',
    })
    expect(writeTextMock).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it('copies the product URL and shows a success toast when native sharing is unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: undefined,
    })
    writeTextMock.mockResolvedValue(undefined)

    act(() => {
      root!.render(<ProductDetails product={product} currentUser={null} />)
    })

    const button = container.querySelector('button[aria-label="Поділитися"]')

    await act(async () => {
      button?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      )
      await Promise.resolve()
    })

    expect(writeTextMock).toHaveBeenCalledWith('http://localhost:3000/products/prod-1')
    expect(toastSuccessMock).toHaveBeenCalledWith('Посилання на товар скопійовано')
    expect(toastErrorMock).not.toHaveBeenCalled()
  })
})
