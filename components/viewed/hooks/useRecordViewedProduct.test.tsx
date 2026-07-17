// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { recordViewedProduct } = vi.hoisted(() => ({
  recordViewedProduct: vi.fn(),
}))

vi.mock('../api/viewed.api', () => ({
  recordViewedProduct,
}))

import { useRecordViewedProduct } from './useRecordViewedProduct'

function TestComponent({ productId }: { productId: string }) {
  useRecordViewedProduct(productId)
  return null
}

describe('useRecordViewedProduct', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean
      }
    ).IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    recordViewedProduct.mockReset()
    recordViewedProduct.mockResolvedValue({ recorded: true })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.useRealTimers()
  })

  it('debounces rapid remounts for the same product', async () => {
    await act(async () => {
      root.render(<TestComponent productId="prod-1" />)
    })

    expect(recordViewedProduct).toHaveBeenCalledTimes(1)

    await act(async () => {
      root.render(<></>)
    })

    await act(async () => {
      root.render(<TestComponent productId="prod-1" />)
    })

    expect(recordViewedProduct).toHaveBeenCalledTimes(1)
  })

  it('records the same product again after the debounce window passes', async () => {
    await act(async () => {
      root.render(<TestComponent productId="prod-2" />)
    })

    expect(recordViewedProduct).toHaveBeenCalledTimes(1)

    await act(async () => {
      root.render(<></>)
    })

    await act(async () => {
      vi.advanceTimersByTime(3001)
    })

    await act(async () => {
      root.render(<TestComponent productId="prod-2" />)
    })

    expect(recordViewedProduct).toHaveBeenCalledTimes(2)
  })
})
