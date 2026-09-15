import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const { getCurrentUserMock, getAdminModerationPageDataMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  getAdminModerationPageDataMock: vi.fn(),
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

vi.mock('@/lib/session/getSession', () => ({
  getCurrentUser: getCurrentUserMock,
}))

vi.mock('@/app/(protected)/admin/_lib/admin-dashboard.data', () => ({
  getAdminModerationPageData: getAdminModerationPageDataMock,
}))

vi.mock('@/components/admin/AdminProductModerationActions', () => ({
  default: ({ productId }: { productId: string }) => (
    <div data-testid="product-actions">{productId}</div>
  ),
}))

vi.mock('@/components/admin/AdminSellerModerationActions', () => ({
  default: ({ sellerId }: { sellerId: string }) => (
    <div data-testid="seller-actions">{sellerId}</div>
  ),
}))

import AdminModerationPage from './page'

describe('AdminModerationPage', () => {
  it('links pending product names to the admin moderation product detail page', async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      roles: ['ADMIN'],
    })
    getAdminModerationPageDataMock.mockResolvedValue({
      pendingSellerQueue: { items: [], total: 0, page: 1, limit: 6 },
      suspendedSellerQueue: { items: [], total: 0, page: 1, limit: 6 },
      rejectedProductQueue: { items: [], total: 0, page: 1, limit: 6 },
      pendingProductQueue: {
        items: [
          {
            id: 'product-1',
            name: 'Сукня для модерації',
            storeId: 'store-1',
            storeName: 'Test Store',
            status: 'PENDING_REVIEW',
            moderationReason: null,
            rejectionReason: null,
            publishedAt: null,
            moderatedAt: null,
            moderatedBy: null,
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
          },
        ],
        total: 1,
        page: 1,
        limit: 6,
      },
    })

    const markup = renderToStaticMarkup(await AdminModerationPage())

    expect(markup).toContain('href="/admin/moderation/products/product-1"')
    expect(markup).toContain('Сукня для модерації')
  })
})
