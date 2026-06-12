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

    beforeEach(() => {
      vi.clearAllMocks()
      vi.useFakeTimers()
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
              name: 'Київ',
              area: 'Київська',
              settlementType:
                'м.',
            },
          ])
          .mockResolvedValueOnce([
            {
              ref: 'city-1',
              name: 'Київ',
              area: 'Київська',
              settlementType:
                'м.',
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
          'Міст не знайдено',
        )

        act(() => {
          input?.focus()
        })

        act(() => {
          setInputValue(
            input!,
            'Ки',
          )
        })

        await flushSearch()

        expect(
          apiGetMock,
        ).toHaveBeenCalledWith(
          '/api/shipping/nova-poshta/cities?q=%D0%9A%D0%B8',
        )
        expect(
          container.textContent,
        ).toContain('Київ')

        act(() => {
          setInputValue(
            input!,
            'Київ',
          )
        })

        await flushSearch()

        expect(
          apiGetMock,
        ).toHaveBeenLastCalledWith(
          '/api/shipping/nova-poshta/cities?q=%D0%9A%D0%B8%D1%97%D0%B2',
        )

        const optionButton =
          Array.from(
            container.querySelectorAll(
              'button',
            ),
          ).find((button) =>
            button.textContent?.includes(
              'Київ',
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
            name: 'Київ',
            area: 'Київська',
            settlementType:
              'м.',
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
            'Льв',
          )
        })

        expect(
          container.textContent,
        ).not.toContain(
          'Міст не знайдено',
        )

        await flushSearch()

        expect(
          container.textContent,
        ).toContain(
          'Міст не знайдено',
        )
      },
    )
  },
)
