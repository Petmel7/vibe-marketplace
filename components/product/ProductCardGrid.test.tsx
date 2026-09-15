import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ProductCardGrid from './ProductCardGrid'

describe('ProductCardGrid', () => {
  it('keeps catalog grids at three columns through 1100px before switching to four columns', () => {
    const markup = renderToStaticMarkup(<ProductCardGrid products={[]} />)

    expect(markup).toContain('md:grid-cols-3')
    expect(markup).toContain('min-[1101px]:grid-cols-4')
    expect(markup).not.toContain('lg:grid-cols-4')
  })
})
