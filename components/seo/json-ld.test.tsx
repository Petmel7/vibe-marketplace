import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import BreadcrumbJsonLd from './BreadcrumbJsonLd'
import ProductJsonLd from './ProductJsonLd'

function extractScriptJson(markup: string) {
  const match = markup.match(/<script[^>]*>([\s\S]*)<\/script>/)
  if (!match) {
    throw new Error('JSON-LD script not found')
  }

  return JSON.parse(match[1] ?? '{}')
}

describe('seo json-ld components', () => {
  it('renders product json-ld with aggregate rating', () => {
    const markup = renderToStaticMarkup(
      <ProductJsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: 'Сукня',
          image: ['https://cdn.example.com/product.jpg'],
          sku: 'SKU-1',
          offers: {
            '@type': 'Offer',
            url: 'https://marketplace.example.com/products/product-1',
            priceCurrency: 'UAH',
            price: '1999.00',
            availability: 'https://schema.org/InStock',
            seller: {
              '@type': 'Organization',
              name: 'Atelier',
            },
          },
        }}
        ratingSummary={{
          averageRating: 4.8,
          totalCount: 12,
          rating1Count: 0,
          rating2Count: 0,
          rating3Count: 1,
          rating4Count: 2,
          rating5Count: 9,
        }}
      />,
    )

    const json = extractScriptJson(markup)

    expect(json['@type']).toBe('Product')
    expect(json.aggregateRating).toMatchObject({
      '@type': 'AggregateRating',
      ratingValue: 4.8,
      reviewCount: 12,
    })
  })

  it('renders breadcrumb json-ld for public pages', () => {
    const markup = renderToStaticMarkup(
      <BreadcrumbJsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Головна',
              item: 'https://marketplace.example.com/',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Сукні',
              item: 'https://marketplace.example.com/products/category/sukni',
            },
          ],
        }}
      />,
    )

    const json = extractScriptJson(markup)

    expect(json['@type']).toBe('BreadcrumbList')
    expect(json.itemListElement).toHaveLength(2)
  })
})
