import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import CheckoutItemCard from './CheckoutItemCard'

describe('CheckoutItemCard', () => {
  it('renders the variant SKU when it is present in the checkout preview item', () => {
    const markup = renderToStaticMarkup(
      <CheckoutItemCard
        item={{
          id: 'item-1',
          productId: 'product-1',
          variantId: 'variant-1',
          sku: 'SKU-001',
          storeId: 'store-1',
          storeName: 'Test Store',
          storeSlug: 'test-store',
          productName: 'Test Shirt',
          variantLabel: 'M / Blue',
          imageUrl: null,
          quantity: 2,
          unitPrice: '49.99',
          lineTotal: '99.98',
          availableStock: 10,
          inStock: true,
          stockStatus: 'IN_STOCK',
        }}
      />,
    )

    expect(markup).toContain('SKU-001')
  })
})
