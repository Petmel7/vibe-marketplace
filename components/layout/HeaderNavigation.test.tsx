// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}))

vi.mock('@/components/cart/CartIcon', () => ({
  default: () => <span data-testid="cart-icon" />,
}))

vi.mock('@/components/auth/AuthUserMenu', () => ({
  default: () => <span data-testid="auth-user-menu" />,
}))

vi.mock('@/components/notifications/NotificationBell', () => ({
  default: () => <span data-testid="notification-bell" />,
}))

vi.mock('@/components/wishlist/WishlistIcon', () => ({
  default: () => <span data-testid="wishlist-icon" />,
}))

vi.mock('@/components/ui/Logo', () => ({
  default: () => <span data-testid="logo">Logo</span>,
}))

import BottomNav from '@/components/layout/BottomNav'
import DesktopHeader from '@/components/layout/DesktopHeader'
import type { CategoryTreeNode } from '@/components/category/category.data'

const categories: CategoryTreeNode[] = [
  {
    id: 'women',
    name: 'Жінкам',
    slug: 'women',
    href: '/catalog/women',
    imageUrl: null,
    pathSegments: ['women'],
    children: [
      {
        id: 'dresses',
        name: 'Сукні',
        slug: 'dresses',
        href: '/catalog/women/dresses',
        imageUrl: null,
        pathSegments: ['women', 'dresses'],
        children: [],
      },
    ],
  },
]

describe('Header navigation naming', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot> | null

  beforeEach(() => {
    vi.clearAllMocks()
    usePathnameMock.mockReturnValue('/')
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

  it('renders a desktop catalog link and a separate categories menu button', async () => {
    act(() => {
      root!.render(
        <DesktopHeader
          categories={categories}
          user={null}
          onSearch={vi.fn()}
        />,
      )
    })

    const catalogLink = Array.from(container.querySelectorAll('a'))
      .find((link) => link.getAttribute('href') === '/catalog')
    const categoriesButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Категорії'))

    expect(catalogLink?.textContent).toContain('Каталог')
    expect(categoriesButton).toBeTruthy()
    expect(categoriesButton?.getAttribute('aria-expanded')).toBe('false')
    expect(categoriesButton?.getAttribute('aria-controls')).toBe('mega-menu-categories')

    await act(async () => {
      categoriesButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const categoryDialog = container.querySelector('[role="dialog"]')
    expect(categoryDialog?.getAttribute('aria-label')).toBe('Категорії товарів')
  })

  it('keeps the mobile bottom nav catalog link pointed to /catalog', () => {
    act(() => {
      root!.render(<BottomNav />)
    })

    const catalogLink = Array.from(container.querySelectorAll('a'))
      .find((link) => link.textContent?.includes('Каталог'))

    expect(catalogLink?.getAttribute('href')).toBe('/catalog')
  })
})
