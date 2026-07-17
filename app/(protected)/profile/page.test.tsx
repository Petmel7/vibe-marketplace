import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const {
  recentlyViewedMock,
  productCardMock,
  getCurrentUserMock,
  getProfileOverviewDataMock,
} = vi.hoisted(() => ({
  recentlyViewedMock: vi.fn(),
  productCardMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  getProfileOverviewDataMock: vi.fn(),
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

vi.mock('@/components/viewed/RecentlyViewed', () => ({
  default: (props: unknown) => {
    recentlyViewedMock(props)
    return <div data-testid="recently-viewed-slider">recently-viewed-slider</div>
  },
}))

vi.mock('@/components/product/ProductCard', () => ({
  default: (props: unknown) => {
    productCardMock(props)
    return <div>legacy-product-card</div>
  },
}))

vi.mock('@/lib/session/getSession', () => ({
  getCurrentUser: getCurrentUserMock,
}))

vi.mock('@/app/(protected)/profile/_lib/profile-dashboard.data', () => ({
  getProfileOverviewData: getProfileOverviewDataMock,
}))

vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
}))

import ProfileOverviewPage from './page'

describe('ProfileOverviewPage recently viewed section', () => {
  it('renders the shared RecentlyViewed slider instead of the old static product card list', async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'buyer@example.com',
    })
    getProfileOverviewDataMock.mockResolvedValue({
      user: { email: 'buyer@example.com' },
      profile: {
        displayName: 'Buyer',
        createdAt: '2026-07-01T00:00:00.000Z',
        phoneNumber: '+380000000000',
      },
      wishlist: { items: [] },
      viewed: {
        items: [
          { id: 'view-1', productId: 'prod-1', name: 'Product 1', price: '10.00', imageUrl: null },
          { id: 'view-2', productId: 'prod-2', name: 'Product 2', price: '20.00', imageUrl: null },
        ],
      },
      recentOrders: [],
      defaultAddress: null,
      addressCount: 0,
      buyerProfile: null,
    })

    const markup = renderToStaticMarkup(await ProfileOverviewPage())

    expect(markup).toContain('recently-viewed-slider')
    expect(recentlyViewedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        showHeading: false,
        emptyState: expect.anything(),
      }),
    )
    expect(productCardMock).not.toHaveBeenCalled()
    expect(markup).not.toContain('legacy-product-card')
  })
})
