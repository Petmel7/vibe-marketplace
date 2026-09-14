import { beforeEach, describe, expect, it, vi } from 'vitest'

const permanentRedirectMock = vi.fn((href: string) => {
  throw new Error(`redirect:${href}`)
})
const notFoundMock = vi.fn(() => {
  throw new Error('not-found')
})
const getSafePublicCategoryCatalogPathByLegacySlugMock = vi.fn()

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  permanentRedirect: permanentRedirectMock,
}))

vi.mock('@/features/categories/category.service', () => ({
  getSafePublicCategoryCatalogPathByLegacySlug: getSafePublicCategoryCatalogPathByLegacySlugMock,
}))

describe('/products/category/[slug] compatibility redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('permanently redirects a public root category to its canonical catalog href', async () => {
    getSafePublicCategoryCatalogPathByLegacySlugMock.mockResolvedValue({
      id: 'root',
      slug: 'women',
      href: '/catalog/women',
      pathSegments: ['women'],
    })
    const { default: Page } = await import('./page')

    await expect(Page({ params: Promise.resolve({ slug: 'women' }) })).rejects.toThrow('redirect:/catalog/women')

    expect(getSafePublicCategoryCatalogPathByLegacySlugMock).toHaveBeenCalledWith('women')
    expect(permanentRedirectMock).toHaveBeenCalledWith('/catalog/women')
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('permanently redirects a public nested category to its full canonical catalog href', async () => {
    getSafePublicCategoryCatalogPathByLegacySlugMock.mockResolvedValue({
      id: 'child',
      slug: 'dresses',
      href: '/catalog/women/dresses',
      pathSegments: ['women', 'dresses'],
    })
    const { default: Page } = await import('./page')

    await expect(Page({ params: Promise.resolve({ slug: 'dresses' }) })).rejects.toThrow(
      'redirect:/catalog/women/dresses',
    )

    expect(permanentRedirectMock).toHaveBeenCalledWith('/catalog/women/dresses')
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('preserves notFound behavior for missing, hidden, inactive, orphaned, or ambiguous category slugs', async () => {
    getSafePublicCategoryCatalogPathByLegacySlugMock.mockResolvedValue(null)
    const { default: Page } = await import('./page')

    await expect(Page({ params: Promise.resolve({ slug: 'missing' }) })).rejects.toThrow('not-found')

    expect(getSafePublicCategoryCatalogPathByLegacySlugMock).toHaveBeenCalledWith('missing')
    expect(notFoundMock).toHaveBeenCalled()
    expect(permanentRedirectMock).not.toHaveBeenCalled()
  })
})
