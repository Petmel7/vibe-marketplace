// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const useViewedProductsMock = vi.hoisted(() => vi.fn())

vi.mock('./hooks/useViewedProducts', () => ({
  useViewedProducts: useViewedProductsMock,
}))

vi.mock('../product/ProductCard', () => ({
  default: ({ name }: { name: string }) => <div data-testid="product-card">{name}</div>,
}))

import RecentlyViewed from './RecentlyViewed'

function buildItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `view-${index + 1}`,
    productId: `product-${index + 1}`,
    name: `Product ${index + 1}`,
    price: '10.00',
    imageUrl: null,
  }))
}

describe('RecentlyViewed desktop navigation', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean
      }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    useViewedProductsMock.mockReset()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('keeps controls hidden when all cards fit without horizontal scrolling', async () => {
    useViewedProductsMock.mockReturnValue({
      items: buildItems(3),
      isLoading: false,
    })

    await act(async () => {
      root.render(<RecentlyViewed />)
    })

    const track = container.querySelector('.ui-scroll-row-snap') as HTMLDivElement
    let scrollLeft = 0

    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 720 })
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 720 })
    Object.defineProperty(track, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value
      },
    })
    Object.defineProperty(track, 'scrollBy', {
      configurable: true,
      value: vi.fn(),
    })

    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(container.querySelector('[aria-label="Попередні товари"]')).toBeNull()
    expect(container.querySelector('[aria-label="Наступні товари"]')).toBeNull()
  })

  it('renders controls on overflow and updates disabled states after scrolling', async () => {
    useViewedProductsMock.mockReturnValue({
      items: buildItems(5),
      isLoading: false,
    })

    await act(async () => {
      root.render(<RecentlyViewed />)
    })

    const track = container.querySelector('.ui-scroll-row-snap') as HTMLDivElement
    let scrollLeft = 0
    const clientWidth = 400
    const scrollWidth = 900
    const maxScrollLeft = scrollWidth - clientWidth

    Object.defineProperty(track, 'clientWidth', { configurable: true, value: clientWidth })
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: scrollWidth })
    Object.defineProperty(track, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value
      },
    })
    Object.defineProperty(track, 'scrollBy', {
      configurable: true,
      value: vi.fn(({ left }: { left: number }) => {
        scrollLeft = Math.max(0, Math.min(maxScrollLeft, scrollLeft + left))
        track.dispatchEvent(new Event('scroll'))
      }),
    })

    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })

    const previousButton = container.querySelector('[aria-label="Попередні товари"]') as HTMLButtonElement
    const nextButton = container.querySelector('[aria-label="Наступні товари"]') as HTMLButtonElement

    expect(previousButton).toBeTruthy()
    expect(nextButton).toBeTruthy()
    expect(previousButton.disabled).toBe(true)
    expect(nextButton.disabled).toBe(false)

    await act(async () => {
      nextButton.click()
    })

    expect(previousButton.disabled).toBe(false)
    expect(nextButton.disabled).toBe(false)

    await act(async () => {
      nextButton.click()
    })

    expect(previousButton.disabled).toBe(false)
    expect(nextButton.disabled).toBe(true)

    await act(async () => {
      previousButton.click()
      previousButton.click()
    })

    expect(previousButton.disabled).toBe(true)
    expect(nextButton.disabled).toBe(false)
  })
})
