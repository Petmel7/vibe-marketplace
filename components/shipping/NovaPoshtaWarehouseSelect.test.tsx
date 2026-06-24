// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}))

vi.mock('@/shared/api/api.client', () => ({
  apiClient: {
    get: apiGetMock,
  },
}))

import NovaPoshtaWarehouseSelect from '@/components/shipping/NovaPoshtaWarehouseSelect'

describe('NovaPoshtaWarehouseSelect', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('loads warehouses after a city is selected', async () => {
    const onChange = vi.fn()

    apiGetMock.mockResolvedValueOnce([
      {
        ref: 'warehouse-1',
        name: 'Відділення №1',
        cityRef: 'city-1',
        cityName: 'Київ',
      },
    ])

    await act(async () => {
      root.render(
        <NovaPoshtaWarehouseSelect cityRef="city-1" value={null} onChange={onChange} />,
      )
      await Promise.resolve()
    })

    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/shipping/nova-poshta/warehouses?cityRef=city-1',
    )
    expect(container.textContent).toContain('Відділення №1')
  })

  it('reuses cached warehouse results for the same cityRef', async () => {
    const onChange = vi.fn()

    apiGetMock.mockResolvedValueOnce([
      {
        ref: 'warehouse-cache-1',
        name: 'Відділення №2',
        cityRef: 'city-cache-1',
        cityName: 'Львів',
      },
    ])

    await act(async () => {
      root.render(
        <NovaPoshtaWarehouseSelect cityRef="city-cache-1" value={null} onChange={onChange} />,
      )
      await Promise.resolve()
    })

    expect(apiGetMock).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('Відділення №2')

    await act(async () => {
      root.render(
        <NovaPoshtaWarehouseSelect cityRef={null} value={null} onChange={onChange} />,
      )
      await Promise.resolve()
    })

    await act(async () => {
      root.render(
        <NovaPoshtaWarehouseSelect cityRef="city-cache-1" value={null} onChange={onChange} />,
      )
      await Promise.resolve()
    })

    expect(apiGetMock).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('Відділення №2')
  })
})
