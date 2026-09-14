import { describe, expect, it } from 'vitest'
import {
  buildCategoryCatalogHref,
  decorateCategoryTree,
} from './category.data'

describe('category catalog href helpers', () => {
  it('builds canonical catalog hrefs from category path segments', () => {
    expect(buildCategoryCatalogHref(['women'])).toBe('/catalog/women')
    expect(buildCategoryCatalogHref(['women', 'dresses'])).toBe('/catalog/women/dresses')
    expect(buildCategoryCatalogHref([' women ', '', 'summer dresses'])).toBe('/catalog/women/summer%20dresses')
  })

  it('decorates category trees with canonical hrefs and path segments', () => {
    const [root] = decorateCategoryTree([
      {
        id: 'root',
        name: 'Жінкам',
        slug: 'women',
        imageUrl: null,
        children: [
          {
            id: 'child',
            name: 'Сукні',
            slug: 'dresses',
            imageUrl: null,
            children: [],
          },
        ],
      },
    ])

    expect(root.href).toBe('/catalog/women')
    expect(root.pathSegments).toEqual(['women'])
    expect(root.children[0].href).toBe('/catalog/women/dresses')
    expect(root.children[0].pathSegments).toEqual(['women', 'dresses'])
  })
})
