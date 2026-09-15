import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ProductCardGrid from './ProductCardGrid'
import ProductCardSkeleton from './ProductCardSkeleton'

describe('ProductCardGrid', () => {
  it('uses the catalog/sidebar grid variant for search and catalog pages', () => {
    const markup = renderToStaticMarkup(<ProductCardGrid products={[]} variant="catalog" />)

    expect(markup).toContain('md:grid-cols-3')
    expect(markup).toContain('xl:grid-cols-4')
    expect(markup).not.toContain('min-[1100px]:grid-cols-4')
    expect(markup).not.toContain('lg:grid-cols-4')
  })

  it('uses a non-overlapping section grid range so Tailwind v4 cannot cascade 3 columns over 4 columns', () => {
    const markup = renderToStaticMarkup(<ProductCardGrid products={[]} />)

    expect(markup).toContain('min-[768px]:max-[1099px]:grid-cols-3')
    expect(markup).toContain('min-[1100px]:grid-cols-4')
    expect(markup).not.toContain('md:grid-cols-3')
    expect(markup).not.toContain('lg:grid-cols-4')
    expect(markup).not.toContain('xl:grid-cols-4')
  })
})

describe('ProductCardSkeleton', () => {
  it('matches the catalog/sidebar grid variant', () => {
    const markup = renderToStaticMarkup(<ProductCardSkeleton variant="catalog" />)

    expect(markup).toContain('md:grid-cols-3')
    expect(markup).toContain('xl:grid-cols-4')
    expect(markup).not.toContain('min-[1100px]:grid-cols-4')
    expect(markup).not.toContain('lg:grid-cols-4')
  })

  it('matches the non-overlapping section grid range by default', () => {
    const markup = renderToStaticMarkup(<ProductCardSkeleton />)

    expect(markup).toContain('min-[768px]:max-[1099px]:grid-cols-3')
    expect(markup).toContain('min-[1100px]:grid-cols-4')
    expect(markup).not.toContain('md:grid-cols-3')
    expect(markup).not.toContain('lg:grid-cols-4')
    expect(markup).not.toContain('xl:grid-cols-4')
  })
})
