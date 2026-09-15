// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/product/CollapsibleSection', () => ({
  default: ({ children, title }: { children: ReactNode; title: string }) => (
    <section aria-label={title}>{children}</section>
  ),
}))

import ProductCharacteristics from '@/components/product/ProductCharacteristics'

describe('ProductCharacteristics', () => {
  it('does not render customer-facing article or SKU text', () => {
    const markup = renderToStaticMarkup(
      <ProductCharacteristics
        variants={[
          {
            id: 'variant-1',
            sku: 'SKU-001',
            size: 'M',
            color: 'Black',
            price: '99.99',
            stock: 10,
          },
        ]}
      />,
    )

    expect(markup).not.toContain('Артикул')
    expect(markup).not.toContain('SKU-001')
    expect(markup).toContain('Колір')
    expect(markup).toContain('Розмір')
  })
})
