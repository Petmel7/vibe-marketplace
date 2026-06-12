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
  pushMock,
  toastInfoMock,
  toastSuccessMock,
  toastErrorMock,
  wishlistToggleMock,
  useCurrentUserMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastInfoMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  wishlistToggleMock: vi.fn(),
  useCurrentUserMock: vi.fn(),
}))

vi.mock(
  'next/navigation',
  () => ({
    usePathname: () =>
      '/catalog',
    useRouter: () => ({
      push: pushMock,
    }),
  }),
)

vi.mock(
  'sonner',
  () => ({
    toast: {
      info: toastInfoMock,
      success:
        toastSuccessMock,
      error: toastErrorMock,
    },
  }),
)

vi.mock(
  '@/hooks/useCurrentUser',
  () => ({
    useCurrentUser: () =>
      useCurrentUserMock(),
  }),
)

vi.mock(
  '@/components/wishlist/services/wishlist.service',
  () => ({
    wishlistService: {
      toggle: wishlistToggleMock,
    },
  }),
)

import WishlistToggleButton from '@/components/wishlist/WishlistToggleButton'
import { useWishlistStore } from '@/store/wishlistStore'

function resetWishlistStore() {
  useWishlistStore.setState({
    productIds: new Set(),
    pendingProductIds:
      new Set(),
    isLoading: false,
  })
}

function createDeferred() {
  let resolve!: () => void
  let reject!: (
    error?: unknown,
  ) => void

  const promise =
    new Promise<void>(
      (
        promiseResolve,
        promiseReject,
      ) => {
        resolve = promiseResolve
        reject = promiseReject
      },
    )

  return {
    promise,
    resolve,
    reject,
  }
}

describe(
  'useWishlist',
  () => {
    let container: HTMLDivElement
    let root: ReturnType<
      typeof createRoot
    >

    beforeEach(() => {
      vi.clearAllMocks()
      resetWishlistStore()
      container =
        document.createElement(
          'div',
        )
      document.body.appendChild(
        container,
      )
      root = createRoot(container)
      useCurrentUserMock.mockReturnValue(
        {
          user: {
            id: 'user-1',
            email:
              'user@example.com',
            roles: ['BUYER'],
          },
          isAuthenticated: true,
          isHydrated: true,
          isRefreshing: false,
          refreshUser:
            vi.fn(),
        },
      )
    })

    afterEach(() => {
      act(() => {
        root.unmount()
      })
      container.remove()
    })

    it(
      'shows an auth-required message for guests without calling the wishlist API',
      () => {
        useCurrentUserMock.mockReturnValue(
          {
            user: null,
            isAuthenticated: false,
            isHydrated: true,
            isRefreshing: false,
            refreshUser:
              vi.fn(),
          },
        )

        act(() => {
          root.render(
            <WishlistToggleButton productId="prod-1" />,
          )
        })

        const button =
          container.querySelector(
            'button',
          )

        act(() => {
          button?.dispatchEvent(
            new MouseEvent(
              'click',
              {
                bubbles: true,
                cancelable: true,
              },
            ),
          )
        })

        expect(
          wishlistToggleMock,
        ).not.toHaveBeenCalled()
        expect(
          toastInfoMock,
        ).toHaveBeenCalledWith(
          'Авторизуйтеся, щоб додати в обране',
        )
        expect(pushMock).toHaveBeenCalledWith(
          '/login?notice=auth-required&next=%2Fcatalog',
        )
      },
    )

    it(
      'adds an item for authenticated users and updates wishlist state optimistically',
      async () => {
        wishlistToggleMock.mockResolvedValue(
          undefined,
        )

        act(() => {
          root.render(
            <WishlistToggleButton productId="prod-1" />,
          )
        })

        const button =
          container.querySelector(
            'button',
          )

        await act(
          async () => {
            button?.dispatchEvent(
              new MouseEvent(
                'click',
                {
                  bubbles: true,
                  cancelable: true,
                },
              ),
            )
            await Promise.resolve()
          },
        )

        expect(
          wishlistToggleMock,
        ).toHaveBeenCalledWith(
          'prod-1',
          false,
        )
        expect(
          useWishlistStore
            .getState()
            .productIds.has(
              'prod-1',
            ),
        ).toBe(true)
        expect(
          toastSuccessMock,
        ).toHaveBeenCalledWith(
          'Додано до обраного',
        )
      },
    )

    it(
      'ignores rapid duplicate clicks while a product mutation is still pending',
      async () => {
        const deferred =
          createDeferred()

        wishlistToggleMock.mockReturnValue(
          deferred.promise,
        )

        act(() => {
          root.render(
            <WishlistToggleButton
              productId="prod-1"
              variant="card"
            />,
          )
        })

        const button =
          container.querySelector(
            'button',
          )

        act(() => {
          button?.dispatchEvent(
            new MouseEvent(
              'click',
              {
                bubbles: true,
                cancelable: true,
              },
            ),
          )
          button?.dispatchEvent(
            new MouseEvent(
              'click',
              {
                bubbles: true,
                cancelable: true,
              },
            ),
          )
        })

        expect(
          wishlistToggleMock,
        ).toHaveBeenCalledTimes(1)
        expect(
          button?.getAttribute(
            'aria-busy',
          ),
        ).toBe('true')
        expect(
          button?.hasAttribute(
            'disabled',
          ),
        ).toBe(true)

        await act(
          async () => {
            deferred.resolve()
            await deferred.promise
          },
        )

        expect(
          button?.getAttribute(
            'aria-busy',
          ),
        ).toBe('false')
        expect(
          button?.hasAttribute(
            'disabled',
          ),
        ).toBe(false)
      },
    )
  },
)
