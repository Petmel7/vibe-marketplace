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

import NovaPoshtaCityCombobox from '@/components/shipping/NovaPoshtaCityCombobox'

const KYI = 'Ки'
const KYIV = 'Київ'
const LVIV = 'Льв'
const BRO = 'Бр'
const ODE = 'Од'
const KYIV_AREA = 'Київська'
const BROVARY = 'Бровари'
const SETTLEMENT_TYPE = 'м.'
const NO_CITIES_TEXT = 'Міст не знайдено'

function setInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
  descriptor?.set?.call(input, value)

  input.dispatchEvent(
    new Event('input', {
      bubbles: true,
    }),
  )
}

async function flushSearch() {
  await act(async () => {
    vi.advanceTimersByTime(300)
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('NovaPoshtaCityCombobox', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    ;(
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean
      }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    consoleWarnSpy.mockRestore()
    container.remove()
    vi.useRealTimers()
  })

  it('triggers city search requests for short and full Cyrillic queries and renders returned cities', async () => {
    const onChange = vi.fn()

    apiGetMock
      .mockResolvedValueOnce([
        {
          ref: 'city-1',
          name: KYIV,
          area: KYIV_AREA,
          settlementType: SETTLEMENT_TYPE,
        },
      ])
      .mockResolvedValueOnce([
        {
          ref: 'city-1',
          name: KYIV,
          area: KYIV_AREA,
          settlementType: SETTLEMENT_TYPE,
        },
      ])

    act(() => {
      root.render(<NovaPoshtaCityCombobox value={null} onChange={onChange} />)
    })

    const input = container.querySelector('input') as HTMLInputElement | null

    expect(container.textContent).not.toContain(NO_CITIES_TEXT)

    act(() => {
      input?.focus()
    })

    act(() => {
      setInputValue(input!, KYI)
    })

    await flushSearch()

    expect(apiGetMock).toHaveBeenCalledWith(
      `/api/shipping/nova-poshta/cities?q=${encodeURIComponent(KYI)}`,
    )
    expect(container.textContent).toContain(KYIV)

    act(() => {
      setInputValue(input!, KYIV)
    })

    await flushSearch()

    expect(apiGetMock).toHaveBeenLastCalledWith(
      `/api/shipping/nova-poshta/cities?q=${encodeURIComponent(KYIV)}`,
    )

    const optionButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(KYIV),
    )

    act(() => {
      optionButton?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(onChange).toHaveBeenCalledWith({
      ref: 'city-1',
      name: KYIV,
      area: KYIV_AREA,
      settlementType: SETTLEMENT_TYPE,
    })
  })

  it('shows the empty state only after a completed search with no results', async () => {
    apiGetMock.mockResolvedValueOnce([])

    act(() => {
      root.render(<NovaPoshtaCityCombobox value={null} onChange={vi.fn()} />)
    })

    const input = container.querySelector('input') as HTMLInputElement | null

    act(() => {
      input?.focus()
      setInputValue(input!, LVIV)
    })

    expect(container.textContent).not.toContain(NO_CITIES_TEXT)

    await flushSearch()

    expect(container.textContent).toContain(NO_CITIES_TEXT)
  })

  it('deduplicates city results by ref before rendering and logs duplicates in development', async () => {
    apiGetMock.mockResolvedValueOnce([
      {
        ref: 'city-1',
        name: KYIV,
        area: KYIV_AREA,
        settlementType: SETTLEMENT_TYPE,
      },
      {
        ref: 'city-1',
        name: `${KYIV} дубль`,
        area: KYIV_AREA,
        settlementType: SETTLEMENT_TYPE,
      },
      {
        ref: 'city-2',
        name: BROVARY,
        area: KYIV_AREA,
        settlementType: SETTLEMENT_TYPE,
      },
    ])

    act(() => {
      root.render(<NovaPoshtaCityCombobox value={null} onChange={vi.fn()} />)
    })

    const input = container.querySelector('input') as HTMLInputElement | null

    act(() => {
      input?.focus()
      setInputValue(input!, BRO)
    })

    await flushSearch()

    const optionButtons = Array.from(container.querySelectorAll('button[role="option"]'))

    expect(optionButtons).toHaveLength(2)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Nova Poshta city search returned duplicate refs',
      {
        duplicateRefs: ['city-1'],
      },
    )
  })

  it('reuses cached city lookup results for the same normalized query', async () => {
    apiGetMock.mockResolvedValueOnce([
      {
        ref: 'city-cache-1',
        name: 'Одеса',
        area: 'Одеська',
        settlementType: 'м.',
      },
    ])

    act(() => {
      root.render(<NovaPoshtaCityCombobox value={null} onChange={vi.fn()} />)
    })

    const input = container.querySelector('input') as HTMLInputElement | null

    act(() => {
      input?.focus()
      setInputValue(input!, `  ${ODE}еса  `)
    })

    await flushSearch()

    expect(apiGetMock).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('Одеса')

    act(() => {
      setInputValue(input!, `${ODE}еса`)
    })

    await flushSearch()

    expect(apiGetMock).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('Одеса')
  })
})
