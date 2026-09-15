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
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: null, isAuthLoading: false }),
}))

vi.mock('@/components/cart/CartIcon', () => ({
  default: ({
    className,
    badgeClassName,
    ariaLabel = 'Кошик',
  }: {
    className?: string
    badgeClassName?: string
    ariaLabel?: string
  }) => (
    <a
      href="/cart"
      className={className}
      aria-label={ariaLabel}
      data-badge-class={badgeClassName}
      data-testid="cart-icon"
    />
  ),
}))

vi.mock('@/components/auth/AuthUserMenu', () => ({
  default: ({
    triggerClassName,
  }: {
    triggerClassName?: string
  }) => (
    <button
      type="button"
      className={triggerClassName}
      aria-label="Відкрити меню акаунта"
      data-testid="auth-user-menu"
    />
  ),
}))

vi.mock('@/components/notifications/NotificationBell', () => ({
  default: ({
    triggerClassName,
    badgeClassName,
  }: {
    triggerClassName?: string
    badgeClassName?: string
  }) => (
    <button
      type="button"
      className={triggerClassName}
      aria-label="Сповіщення"
      data-badge-class={badgeClassName}
      data-testid="notification-bell"
    />
  ),
}))

vi.mock('@/components/wishlist/WishlistIcon', () => ({
  default: ({
    className,
    badgeClassName,
    ariaLabel = 'Обране',
  }: {
    className?: string
    badgeClassName?: string
    ariaLabel?: string
  }) => (
    <a
      href="/wishlist"
      className={className}
      aria-label={ariaLabel}
      data-badge-class={badgeClassName}
      data-testid="wishlist-icon"
    />
  ),
}))

vi.mock('@/components/ui/Logo', () => ({
  default: () => <span data-testid="logo">Logo</span>,
}))

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}))

import BottomNav from '@/components/layout/BottomNav'
import DesktopHeader from '@/components/layout/DesktopHeader'
import HeaderClient from '@/components/layout/HeaderClient'
import MobileHeader from '@/components/layout/MobileHeader'
import TabletHeader from '@/components/layout/TabletHeader'
import type { CategoryTreeNode } from '@/components/category/category.data'
import type { SessionUser } from '@/types/auth'

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

const signedInUser: SessionUser = {
  id: 'user-1',
  email: 'buyer@example.com',
  roles: ['BUYER'],
}

describe('Header navigation naming', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot> | null
  let mediaQueryListeners: Map<string, Set<(event: MediaQueryListEvent) => void>>

  const fireMediaQueryChange = (query: string, matches: boolean) => {
    for (const listener of mediaQueryListeners.get(query) ?? []) {
      listener({ matches } as MediaQueryListEvent)
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    usePathnameMock.mockReturnValue('/')
    mediaQueryListeners = new Map()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            const listeners = mediaQueryListeners.get(query) ?? new Set()
            listeners.add(listener)
            mediaQueryListeners.set(query, listeners)
          }
        }),
        removeEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            mediaQueryListeners.get(query)?.delete(listener)
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

  it('mounts mobile, tablet, and desktop headers at the intended breakpoints', () => {
    act(() => {
      root!.render(<HeaderClient categories={categories} />)
    })

    const headers = Array.from(container.querySelectorAll('header'))

    expect(headers).toHaveLength(3)
    expect(headers[0].className).toContain('md:hidden')
    expect(headers[1].className).toContain('hidden md:block lg:hidden')
    expect(headers[2].className).toContain('relative hidden lg:block')
  })

  it('renders a compact tablet catalog link and category drawer opener without desktop mega menu', async () => {
    act(() => {
      root!.render(
        <TabletHeader
          categories={categories}
          user={signedInUser}
          onSearch={vi.fn()}
        />,
      )
    })

    const catalogLink = Array.from(container.querySelectorAll('a'))
      .find((link) => link.getAttribute('href') === '/catalog')
    const categoriesButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Відкрити категорії"]',
    )
    const searchButton = container.querySelector<HTMLButtonElement>('button[aria-label="Пошук"]')
    const wishlistIcon = container.querySelector<HTMLElement>('[data-testid="wishlist-icon"]')
    const cartIcon = container.querySelector<HTMLElement>('[data-testid="cart-icon"]')
    const notificationButton = container.querySelector<HTMLElement>('[data-testid="notification-bell"]')
    const authButton = container.querySelector<HTMLElement>('[data-testid="auth-user-menu"]')

    expect(catalogLink?.textContent).toContain('Каталог')
    expect(categoriesButton?.getAttribute('aria-expanded')).toBe('false')
    expect(categoriesButton?.getAttribute('aria-controls')).toBe('mobile-category-sheet')
    expect(categoriesButton?.className).toContain('h-10')
    expect(categoriesButton?.className).toContain('w-10')
    expect(searchButton?.className).toContain('h-10')
    expect(searchButton?.className).toContain('w-10')
    expect(wishlistIcon?.className).toContain('h-10')
    expect(wishlistIcon?.className).toContain('w-10')
    expect(cartIcon?.className).toContain('h-10')
    expect(cartIcon?.className).toContain('w-10')
    expect(notificationButton?.className).toContain('h-10')
    expect(notificationButton?.className).toContain('w-10')
    expect(authButton?.className).toContain('h-10')
    expect(authButton?.className).toContain('w-10')
    expect(wishlistIcon?.getAttribute('data-badge-class')).toBe('right-0 top-0')
    expect(cartIcon?.getAttribute('data-badge-class')).toBe('right-0 top-0')
    expect(notificationButton?.getAttribute('data-badge-class')).toBe('right-0 top-0')
    expect(container.querySelector('[aria-label="Категорії товарів"]')).toBeNull()

    await act(async () => {
      categoriesButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(categoriesButton?.getAttribute('aria-expanded')).toBe('true')
    expect(document.body.querySelector('[role="dialog"]')?.id).toBe('mobile-category-sheet')
    expect(document.body.textContent).toContain('Жіночі сукні')
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
    expect(categoriesButton?.className).toContain('h-10')
    expect(categoriesButton?.className).toContain('w-10')

    await act(async () => {
      categoriesButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(categoriesButton?.getAttribute('aria-expanded')).toBe('true')

    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog?.textContent).toContain('Категорії')
    expect(dialog?.id).toBe(categoriesButton?.getAttribute('aria-controls'))
    expect(document.getElementById(categoriesButton?.getAttribute('aria-controls') ?? '')).toBe(dialog)

    const closeButton = Array.from(document.body.querySelectorAll('button'))
      .find((button) => button.getAttribute('aria-label') === 'Закрити категорії')
    expect(closeButton?.className).toContain('h-10')
    expect(closeButton?.className).toContain('w-10')

    const rootTabList = document.body.querySelector('[role="tablist"][aria-label="Основні категорії"]')
    const rootTabs = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    const selectedRootTab = rootTabs.find((tab) => tab.textContent?.includes('Одяг та взуття'))
    const rootPanel = document.body.querySelector('[role="tabpanel"]')

    expect(rootTabList).toBeTruthy()
    expect(rootTabs).toHaveLength(2)
    expect(selectedRootTab?.getAttribute('aria-selected')).toBe('true')
    expect(selectedRootTab?.getAttribute('aria-controls')).toBe(rootPanel?.id)
    expect(rootPanel?.getAttribute('aria-labelledby')).toBe(selectedRootTab?.id)

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
    expect(menRootButton?.getAttribute('aria-selected')).toBe('true')
    expect(document.body.querySelector('[role="tabpanel"]')?.id).toBe(
      menRootButton?.getAttribute('aria-controls'),
    )

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
      fireMediaQueryChange('(min-width: 768px)', true)
    })

    expect(categoriesButton?.getAttribute('aria-expanded')).toBe('false')
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('closes the tablet categories dialog when the viewport reaches the lg breakpoint', async () => {
    act(() => {
      root!.render(
        <TabletHeader
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
      fireMediaQueryChange('(min-width: 1024px)', true)
    })

    expect(categoriesButton?.getAttribute('aria-expanded')).toBe('false')
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })
})
