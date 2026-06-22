// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const useCurrentUserMock = vi.fn()
const cartGetMock = vi.fn()

const mockCartStoreState = {
  sessionId: 'guest-session-1',
  itemCount: 0,
  refreshKey: 0,
  ensureSessionId: vi.fn(() => 'guest-session-1'),
  setItemCount: vi.fn((count: number) => {
    mockCartStoreState.itemCount = count
  }),
  bumpRefreshKey: vi.fn(() => {
    mockCartStoreState.refreshKey += 1
  }),
  openCart: vi.fn(),
  closeCart: vi.fn(),
}

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => useCurrentUserMock(),
}))

vi.mock('@/components/cart/api/cart.api', () => ({
  cartApi: {
    get: (...args: unknown[]) => cartGetMock(...args),
  },
}))

vi.mock('@/store/cartStore', () => {
  const useCartStoreMock = ((selector?: (state: typeof mockCartStoreState) => unknown) =>
    selector ? selector(mockCartStoreState) : mockCartStoreState) as typeof import('@/store/cartStore').useCartStore

  Object.assign(useCartStoreMock, {
    getState: () => mockCartStoreState,
    setState: (partial: Partial<typeof mockCartStoreState>) =>
      Object.assign(mockCartStoreState, partial),
  })

  return {
    useCartStore: useCartStoreMock,
  }
})

import { useCart } from '@/components/cart/hooks/useCart'

function CartProbe() {
  const { cart, isLoading } = useCart()

  return (
    <div>
      <span data-testid="cart-loading">{isLoading ? 'loading' : 'loaded'}</span>
      <span data-testid="cart-count">{cart?.itemCount ?? 0}</span>
    </div>
  )
}

async function flushAsyncWork() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('useCart', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    mockCartStoreState.sessionId = 'guest-session-1'
    mockCartStoreState.itemCount = 0
    mockCartStoreState.refreshKey = 0

    useCurrentUserMock.mockReturnValue({
      isAuthenticated: false,
      hasCompletedInitialSync: true,
      isSyncingUser: false,
    })

    cartGetMock.mockResolvedValue({
      id: 'cart-1',
      itemCount: 2,
      totalAmount: '100.00',
      items: [],
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false
    container.remove()
  })

  it('waits for auth sync completion before loading the cart', async () => {
    useCurrentUserMock.mockReturnValue({
      isAuthenticated: false,
      hasCompletedInitialSync: false,
      isSyncingUser: true,
    })

    await act(async () => {
      root.render(<CartProbe />)
      await flushAsyncWork()
    })

    expect(container.querySelector('[data-testid="cart-loading"]')?.textContent).toBe(
      'loading',
    )
    expect(cartGetMock).not.toHaveBeenCalled()
  })

  it('loads the authenticated cart only after sync completes', async () => {
    await act(async () => {
      root.render(<CartProbe />)
      await flushAsyncWork()
    })

    expect(cartGetMock).toHaveBeenCalledWith({ sessionId: 'guest-session-1' })
    expect(container.querySelector('[data-testid="cart-loading"]')?.textContent).toBe(
      'loaded',
    )
    expect(container.querySelector('[data-testid="cart-count"]')?.textContent).toBe('2')
  })

  it('switches to the authenticated cart request after user sync completes', async () => {
    useCurrentUserMock.mockReturnValue({
      isAuthenticated: false,
      hasCompletedInitialSync: false,
      isSyncingUser: true,
    })

    await act(async () => {
      root.render(<CartProbe />)
      await flushAsyncWork()
    })

    expect(cartGetMock).not.toHaveBeenCalled()

    useCurrentUserMock.mockReturnValue({
      isAuthenticated: true,
      hasCompletedInitialSync: true,
      isSyncingUser: false,
    })

    await act(async () => {
      root.render(<CartProbe />)
      await flushAsyncWork()
    })

    expect(cartGetMock).toHaveBeenCalledWith({ auth: true })
    expect(container.querySelector('[data-testid="cart-loading"]')?.textContent).toBe(
      'loaded',
    )
  })
})
