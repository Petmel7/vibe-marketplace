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

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}))

import BottomNav from '@/components/layout/BottomNav'
import DesktopHeader from '@/components/layout/DesktopHeader'
import MobileHeader from '@/components/layout/MobileHeader'
import type { CategoryTreeNode } from '@/components/category/category.data'

const categories: CategoryTreeNode[] = [
  {
    id: 'clothing',
    name: 'Одяг та взуття',
    slug: 'clothing',
    href: '/catalog/clothing',
    imageUrl: null,
    pathSegments: ['clothing'],
    children: [
      {
        id: 'women-clothing',
        name: 'Жіночий одяг',
        slug: 'women-clothing',
        href: '/catalog/clothing/women-clothing',
        imageUrl: null,
        pathSegments: ['clothing', 'women-clothing'],
        children: [
          {
            id: 'women-dresses',
            name: 'Жіночі сукні',
            slug: 'women-dresses',
            href: '/catalog/clothing/women-clothing/women-dresses',
            imageUrl: null,
            pathSegments: ['clothing', 'women-clothing', 'women-dresses'],
            children: [],
          },
        ],
      },
      {
        id: 'shoes',
        name: 'Взуття',
        slug: 'shoes',
        href: '/catalog/clothing/shoes',
        imageUrl: null,
        pathSegments: ['clothing', 'shoes'],
        children: [],
      },
    ],
  },
  {
    id: 'men',
    name: 'Чоловікам',
    slug: 'men',
    href: '/catalog/men',
    imageUrl: null,
    pathSegments: ['men'],
    children: [
      {
        id: 'shirts',
        name: 'Сорочки',
        slug: 'shirts',
        href: '/catalog/men/shirts',
        imageUrl: null,
        pathSegments: ['men', 'shirts'],
        children: [],
      },
    ],
  },
]

describe('Header navigation naming', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot> | null
  let mediaQueryListeners: Set<(event: MediaQueryListEvent) => void>

  beforeEach(() => {
    vi.clearAllMocks()
    usePathnameMock.mockReturnValue('/')
    mediaQueryListeners = new Set()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            mediaQueryListeners.add(listener)
          }
        }),
        removeEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            mediaQueryListeners.delete(listener)
          }
        }),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
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
    const categoriesLink = Array.from(container.querySelectorAll('a'))
      .find((link) => link.textContent?.includes('Категорії'))

    expect(catalogLink?.getAttribute('href')).toBe('/catalog')
    expect(categoriesLink).toBeUndefined()
  })

  it('opens a mobile categories drawer with canonical category links', async () => {
    act(() => {
      root!.render(
        <MobileHeader
          categories={categories}
          user={null}
          onSearch={vi.fn()}
        />,
      )
    })

    const categoriesButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Відкрити категорії"]',
    )

    expect(categoriesButton).toBeTruthy()
    expect(categoriesButton?.getAttribute('aria-expanded')).toBe('false')
    expect(categoriesButton?.getAttribute('aria-controls')).toBe('mobile-category-sheet')

    await act(async () => {
      categoriesButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(categoriesButton?.getAttribute('aria-expanded')).toBe('true')

    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog?.textContent).toContain('Категорії')
    expect(dialog?.id).toBe(categoriesButton?.getAttribute('aria-controls'))
    expect(document.getElementById(categoriesButton?.getAttribute('aria-controls') ?? '')).toBe(dialog)
    expect(dialog?.textContent).toContain('Одяг та взуття')
    expect(dialog?.textContent).toContain('Чоловікам')
    expect(dialog?.textContent).toContain('Жіночий одяг')
    expect(dialog?.textContent).toContain('Жіночі сукні')
    expect(dialog?.textContent).toContain('Взуття')
    expect(dialog?.textContent).not.toContain('Сорочки')
    expect(dialog?.textContent).not.toContain('Переглянути всі товари')
    expect(dialog?.textContent).not.toContain('Підкатегорії')

    const allCategoriesLink = Array.from(document.body.querySelectorAll('a'))
      .find((link) => link.textContent?.trim() === 'Усі')
    const intermediateCategoryLink = Array.from(document.body.querySelectorAll('a'))
      .find((link) => link.textContent?.includes('Жіночий одяг'))
    const leafCategoryLink = Array.from(document.body.querySelectorAll('a'))
      .find((link) => link.textContent?.includes('Жіночі сукні'))

    expect(allCategoriesLink).toBeUndefined()
    expect(intermediateCategoryLink).toBeUndefined()
    expect(leafCategoryLink?.getAttribute('href')).toBe('/catalog/clothing/women-clothing/women-dresses')

    const menRootButton = Array.from(document.body.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Чоловікам'))

    await act(async () => {
      menRootButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.body.textContent).toContain('Сорочки')

    const nestedCategoryLink = Array.from(document.body.querySelectorAll('a'))
      .find((link) => link.textContent?.includes('Сорочки'))

    expect(nestedCategoryLink?.getAttribute('href')).toBe('/catalog/men/shirts')

    await act(async () => {
      nestedCategoryLink?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(categoriesButton?.getAttribute('aria-expanded')).toBe('false')
  })

  it('closes the mobile categories dialog when the viewport reaches the md breakpoint', async () => {
    act(() => {
      root!.render(
        <MobileHeader
          categories={categories}
          user={null}
          onSearch={vi.fn()}
        />,
      )
    })

    const categoriesButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Відкрити категорії"]',
    )

    await act(async () => {
      categoriesButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(categoriesButton?.getAttribute('aria-expanded')).toBe('true')
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy()

    await act(async () => {
      for (const listener of mediaQueryListeners) {
        listener({ matches: true } as MediaQueryListEvent)
      }
    })

    expect(categoriesButton?.getAttribute('aria-expanded')).toBe('false')
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })
})
