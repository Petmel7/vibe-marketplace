// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import CategoryCards from './CategoryCards'
import type { CategoryListItem } from './category.data'

const categories: CategoryListItem[] = [
  {
    id: 'dresses',
    name: 'Сукні',
    slug: 'dresses',
    imageUrl: null,
    href: '/catalog/women/dresses',
    pathSegments: ['women', 'dresses'],
  },
]

describe('CategoryCards', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot> | null

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount()
      })
    }
    container.remove()
  })

  it('links category cards to canonical catalog hrefs', () => {
    act(() => {
      root!.render(<CategoryCards categories={categories} layout="grid" />)
    })

    const link = container.querySelector('a')

    expect(link?.getAttribute('href')).toBe('/catalog/women/dresses')
  })
})
