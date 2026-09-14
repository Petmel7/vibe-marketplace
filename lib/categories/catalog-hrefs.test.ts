import { describe, expect, it } from 'vitest'
import {
  buildCategoryCatalogHref,
  buildCategoryCatalogPathIndex,
} from './catalog-hrefs'

describe('category catalog href helpers', () => {
  it('builds encoded canonical catalog hrefs from path segments', () => {
    expect(buildCategoryCatalogHref(['women', 'summer dresses'])).toBe('/catalog/women/summer%20dresses')
    expect(buildCategoryCatalogHref([' ', ''])).toBe('/catalog')
  })

  it('indexes nested category paths and skips categories without a root path', () => {
    const index = buildCategoryCatalogPathIndex([
      {
        id: 'root',
        slug: 'women',
        parentId: null,
        position: 0,
        name: 'Жінкам',
      },
      {
        id: 'child',
        slug: 'dresses',
        parentId: 'root',
        position: 0,
        name: 'Сукні',
      },
      {
        id: 'orphan',
        slug: 'orphan',
        parentId: 'missing',
        position: 0,
        name: 'Осиротіла',
      },
    ])

    expect(index.byId.get('root')).toMatchObject({
      href: '/catalog/women',
      pathSegments: ['women'],
    })
    expect(index.byId.get('child')).toMatchObject({
      href: '/catalog/women/dresses',
      pathSegments: ['women', 'dresses'],
    })
    expect(index.byId.has('orphan')).toBe(false)
  })
})
