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

const toggleMock = vi.fn()
const useWishlistMock = vi.fn()

vi.mock(
  '@/components/wishlist/hooks/useWishlist',
  () => ({
    useWishlist: () =>
      useWishlistMock(),
  }),
)

import WishlistToggleButton from '@/components/wishlist/WishlistToggleButton'

describe(
  'WishlistToggleButton',
  () => {
    let container: HTMLDivElement
    let root: ReturnType<
      typeof createRoot
    >

    beforeEach(() => {
      vi.clearAllMocks()
      container =
        document.createElement(
          'div',
        )
      document.body.appendChild(
        container,
      )
      root = createRoot(container)
      useWishlistMock.mockReturnValue(
        {
          productIds:
            new Set<string>(),
          pendingProductIds:
            new Set<string>(),
          toggle: toggleMock,
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
      'toggles wishlist without bubbling click navigation events in card mode',
      () => {
        const parentClick =
          vi.fn()
        const wrapper =
          document.createElement(
            'div',
          )
        container.appendChild(
          wrapper,
        )
        root = createRoot(wrapper)

        act(() => {
          root.render(
            <div
              onClick={
                parentClick
              }
            >
              <WishlistToggleButton
                productId="prod-1"
                variant="card"
              />
            </div>,
          )
        })

        const button =
          wrapper.querySelector(
            'button',
          )
        expect(button).not.toBeNull()

        const clickEvent =
          new MouseEvent(
            'click',
            {
              bubbles: true,
              cancelable: true,
            },
          )
        const dispatchResult =
          button!.dispatchEvent(
            clickEvent,
          )

        expect(dispatchResult).toBe(
          false,
        )
        expect(
          parentClick,
        ).not.toHaveBeenCalled()
        expect(
          toggleMock,
        ).toHaveBeenCalledWith(
          'prod-1',
        )
      },
    )

    it(
      'marks the button busy and disabled while the product mutation is pending',
      () => {
        useWishlistMock.mockReturnValue(
          {
            productIds:
              new Set<string>([
                'prod-1',
              ]),
            pendingProductIds:
              new Set<string>([
                'prod-1',
              ]),
            toggle: toggleMock,
          },
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

        expect(
          button?.getAttribute(
            'aria-busy',
          ),
        ).toBe('true')
        expect(
          button?.getAttribute(
            'aria-pressed',
          ),
        ).toBe('true')
        expect(
          button?.hasAttribute(
            'disabled',
          ),
        ).toBe(true)
      },
    )
  },
)
