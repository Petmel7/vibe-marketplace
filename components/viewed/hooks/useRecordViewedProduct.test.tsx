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
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    window.sessionStorage.clear()
    recordViewedProduct.mockReset()
    recordViewedProduct.mockResolvedValue({ recorded: true })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    window.sessionStorage.clear()
  })

  it('records a viewed product only once across remounts in the same session', async () => {
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

  it('skips the API call when the product was already recorded in sessionStorage', async () => {
    window.sessionStorage.setItem('viewed:recorded:prod-2', '1')

    await act(async () => {
      root.render(<TestComponent productId="prod-2" />)
    })

    expect(recordViewedProduct).not.toHaveBeenCalled()
  })
})
