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

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}))

vi.mock('@/shared/api/api.client', () => ({
  apiClient: {
    get: apiGetMock,
  },
}))

import NovaPoshtaCityCombobox from '@/components/shipping/NovaPoshtaCityCombobox'

const KYI = '\u041a\u0438'
const KYIV = '\u041a\u0438\u0457\u0432'
const LVIV = '\u041b\u044c\u0432'
const KYIV_AREA = '\u041a\u0438\u0457\u0432\u0441\u044c\u043a\u0430'
const BROVARY = '\u0411\u0440\u043e\u0432\u0430\u0440\u0438'
const SETTLEMENT_TYPE = '\u043c.'
const NO_CITIES_TEXT = '\u041c\u0456\u0441\u0442 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e'

function setInputValue(
  input: HTMLInputElement,
  value: string,
) {
  const descriptor =
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )

  descriptor?.set?.call(
    input,
    value,
  )

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

describe(
  'NovaPoshtaCityCombobox',
  () => {
    let container: HTMLDivElement
    let root: ReturnType<
      typeof createRoot
    >
    let consoleWarnSpy: ReturnType<
      typeof vi.spyOn
    >

    beforeEach(() => {
      vi.clearAllMocks()
      vi.useFakeTimers()
      consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      ;(
        globalThis as typeof globalThis & {
          IS_REACT_ACT_ENVIRONMENT?: boolean
        }
      ).IS_REACT_ACT_ENVIRONMENT = true
      container =
        document.createElement(
          'div',
        )
      document.body.appendChild(
        container,
      )
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

    it(
      'triggers city search requests for short and full Cyrillic queries and renders returned cities',
      async () => {
        const onChange =
          vi.fn()

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
          root.render(
            <NovaPoshtaCityCombobox
              value={null}
              onChange={
                onChange
              }
            />,
          )
        })

        const input =
          container.querySelector(
            'input',
          ) as HTMLInputElement | null

        expect(
          container.textContent,
        ).not.toContain(
          NO_CITIES_TEXT,
        )

        act(() => {
          input?.focus()
        })

        act(() => {
          setInputValue(
            input!,
            KYI,
          )
        })

        await flushSearch()

        expect(
          apiGetMock,
        ).toHaveBeenCalledWith(
          `/api/shipping/nova-poshta/cities?q=${encodeURIComponent(KYI)}`,
        )
        expect(
          container.textContent,
        ).toContain(KYIV)

        act(() => {
          setInputValue(
            input!,
            KYIV,
          )
        })

        await flushSearch()

        expect(
          apiGetMock,
        ).toHaveBeenLastCalledWith(
          `/api/shipping/nova-poshta/cities?q=${encodeURIComponent(KYIV)}`,
        )

        const optionButton =
          Array.from(
            container.querySelectorAll(
              'button',
            ),
          ).find((button) =>
            button.textContent?.includes(
              KYIV,
            ),
          )

        act(() => {
          optionButton?.dispatchEvent(
            new MouseEvent(
              'click',
              {
                bubbles: true,
                cancelable: true,
              },
            ),
          )
        })

        expect(onChange).toHaveBeenCalledWith(
          {
            ref: 'city-1',
            name: KYIV,
            area: KYIV_AREA,
            settlementType: SETTLEMENT_TYPE,
          },
        )
      },
    )

    it(
      'shows the empty state only after a completed search with no results',
      async () => {
        apiGetMock.mockResolvedValueOnce(
          [],
        )

        act(() => {
          root.render(
            <NovaPoshtaCityCombobox
              value={null}
              onChange={vi.fn()}
            />,
          )
        })

        const input =
          container.querySelector(
            'input',
          ) as HTMLInputElement | null

        act(() => {
          input?.focus()
          setInputValue(
            input!,
            LVIV,
          )
        })

        expect(
          container.textContent,
        ).not.toContain(
          NO_CITIES_TEXT,
        )

        await flushSearch()

        expect(
          container.textContent,
        ).toContain(NO_CITIES_TEXT)
      },
    )

    it(
      'deduplicates city results by ref before rendering and logs duplicates in development',
      async () => {
        apiGetMock.mockResolvedValueOnce([
          {
            ref: 'city-1',
            name: KYIV,
            area: KYIV_AREA,
            settlementType: SETTLEMENT_TYPE,
          },
          {
            ref: 'city-1',
            name: `${KYIV} \u0434\u0443\u0431\u043b\u044c`,
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
          root.render(
            <NovaPoshtaCityCombobox
              value={null}
              onChange={vi.fn()}
            />,
          )
        })

        const input =
          container.querySelector(
            'input',
          ) as HTMLInputElement | null

        act(() => {
          input?.focus()
          setInputValue(
            input!,
            KYI,
          )
        })

        await flushSearch()

        const optionButtons =
          Array.from(
            container.querySelectorAll(
              'button[role="option"]',
            ),
          )

        expect(optionButtons).toHaveLength(2)
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Nova Poshta city search returned duplicate refs',
          {
            duplicateRefs: ['city-1'],
          },
        )
      },
    )
  },
)
