import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ProductDetailsShell from './ProductDetailsShell'

describe('ProductDetailsShell', () => {
  it('keeps reviews below the gallery on desktop while preserving mobile document flow', () => {
    const markup = renderToStaticMarkup(
      <ProductDetailsShell
        gallery={<div data-testid="gallery">gallery</div>}
        purchasePanel={<div data-testid="purchase">purchase</div>}
        reviews={<div data-testid="reviews">reviews</div>}
      />,
    )

    expect(markup).toContain('order-1 min-w-0 lg:col-start-1 lg:row-start-1')
    expect(markup).toContain(
      'order-2 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start lg:sticky lg:top-24',
    )
    expect(markup).toContain('order-3 min-w-0 lg:col-start-1 lg:row-start-2')

    const galleryIndex = markup.indexOf('data-testid="gallery"')
    const purchaseIndex = markup.indexOf('data-testid="purchase"')
    const reviewsIndex = markup.indexOf('data-testid="reviews"')

    expect(galleryIndex).toBeGreaterThanOrEqual(0)
    expect(purchaseIndex).toBeGreaterThan(galleryIndex)
    expect(reviewsIndex).toBeGreaterThan(purchaseIndex)
  })
})
