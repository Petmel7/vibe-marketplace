// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const viewedApiMock = vi.hoisted(() => {
  const listeners = new Set<() => void>()

  return {
    fetchViewedProducts: vi.fn(),
    subscribeToViewedProductsUpdated: vi.fn((listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }),
    emitViewedProductsUpdated: () => {
      for (const listener of listeners) {
        listener()
      }
    },
  }
})

vi.mock('../api/viewed.api', () => ({
  fetchViewedProducts: viewedApiMock.fetchViewedProducts,
  subscribeToViewedProductsUpdated: viewedApiMock.subscribeToViewedProductsUpdated,
}))

import { useViewedProducts } from './useViewedProducts'

function TestComponent({ currentProductId }: { currentProductId: string }) {
  const { items, isLoading } = useViewedProducts(currentProductId)

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="items">
        {items.map((item) => item.productId).join(',')}
      </div>
    </div>
  )
}

describe('useViewedProducts', () => {
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
    viewedApiMock.fetchViewedProducts.mockReset()
    viewedApiMock.subscribeToViewedProductsUpdated.mockClear()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('refreshes the list after a viewed-product update and keeps the current product excluded', async () => {
    viewedApiMock.fetchViewedProducts
      .mockResolvedValueOnce({
        items: [
          { id: '1', productId: 'prod-a', name: 'A', price: '10.00', imageUrl: null, viewedAt: '2026-07-17T10:00:00.000Z' },
          { id: '2', productId: 'prod-b', name: 'B', price: '20.00', imageUrl: null, viewedAt: '2026-07-17T09:00:00.000Z' },
          { id: '3', productId: 'prod-c', name: 'C', price: '30.00', imageUrl: null, viewedAt: '2026-07-17T08:00:00.000Z' },
        ],
      })
      .mockResolvedValueOnce({
        items: [
          { id: '4', productId: 'prod-d', name: 'D', price: '40.00', imageUrl: null, viewedAt: '2026-07-17T11:00:00.000Z' },
          { id: '3', productId: 'prod-c', name: 'C', price: '30.00', imageUrl: null, viewedAt: '2026-07-17T10:59:00.000Z' },
          { id: '1', productId: 'prod-a', name: 'A', price: '10.00', imageUrl: null, viewedAt: '2026-07-17T10:00:00.000Z' },
          { id: '2', productId: 'prod-b', name: 'B', price: '20.00', imageUrl: null, viewedAt: '2026-07-17T09:00:00.000Z' },
        ],
      })

    await act(async () => {
      root.render(<TestComponent currentProductId="prod-c" />)
    })

    expect(container.querySelector('[data-testid="items"]')?.textContent).toBe('prod-a,prod-b')

    await act(async () => {
      viewedApiMock.emitViewedProductsUpdated()
      await Promise.resolve()
    })

    expect(viewedApiMock.fetchViewedProducts).toHaveBeenCalledTimes(2)
    expect(container.querySelector('[data-testid="items"]')?.textContent).toBe('prod-d,prod-a,prod-b')
    expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe('false')
  })
})
