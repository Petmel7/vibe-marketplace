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

const {
  addItemMock,
  toastSuccessMock,
  useCurrentUserMock,
} = vi.hoisted(() => ({
  addItemMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  useCurrentUserMock: vi.fn(),
}))

const mockCartStoreState = {
  sessionId: 'guest-session-id',
  itemCount: 0,
  ensureSessionId: vi.fn(() => 'guest-session-id'),
  setItemCount: vi.fn((count: number) => {
    mockCartStoreState.itemCount = count
  }),
}

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
  },
}))

vi.mock('@/components/cart/api/cart.api', () => ({
  cartApi: {
    addItem: addItemMock,
  },
}))

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => useCurrentUserMock(),
}))

vi.mock('@/store/cartStore', () => {
  const useCartStoreMock = ((selector?: (state: typeof mockCartStoreState) => unknown) =>
    selector ? selector(mockCartStoreState) : mockCartStoreState) as typeof import('@/store/cartStore').useCartStore

  Object.assign(useCartStoreMock, {
    getState: () => mockCartStoreState,
    setState: (partial: Partial<typeof mockCartStoreState>) => Object.assign(mockCartStoreState, partial),
  })

  return {
    useCartStore: useCartStoreMock,
  }
})

import AddToCartButton from '@/components/cart/AddToCartButton'

describe('AddToCartButton', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot> | null

  beforeEach(() => {
    vi.clearAllMocks()
    mockCartStoreState.sessionId = 'guest-session-id'
    mockCartStoreState.itemCount = 0
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    useCurrentUserMock.mockReturnValue({
      isAuthenticated: true,
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

  it('shows success feedback for authenticated add-to-cart actions', async () => {
    addItemMock.mockResolvedValue({
      itemCount: 2,
    })

    act(() => {
      root!.render(
        <AddToCartButton
          variantId="variant-1"
          quantity={1}
        />,
      )
    })

    const button = container.querySelector('button')

    await act(async () => {
      button?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      )
      await Promise.resolve()
    })

    expect(addItemMock).toHaveBeenCalledWith(
      { auth: true },
      'variant-1',
      1,
    )
    expect(toastSuccessMock).toHaveBeenCalledWith('Товар додано в кошик')
  })
})
