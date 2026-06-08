import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/_lib/seo.data', () => ({
  getCachedSitemapEntries: vi.fn(),
}))

import { getCachedSitemapEntries } from '@/app/_lib/seo.data'
import sitemap from './sitemap'

const mockGetCachedSitemapEntries = vi.mocked(getCachedSitemapEntries)

describe('app sitemap', () => {
  it('returns only public indexable urls', async () => {
    mockGetCachedSitemapEntries.mockResolvedValue([
      {
        loc: 'https://marketplace.example.com/',
        lastModified: '2026-06-08T12:00:00.000Z',
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        loc: 'https://marketplace.example.com/search',
        lastModified: '2026-06-08T12:00:00.000Z',
        changeFrequency: 'weekly',
        priority: 0.5,
      },
      {
        loc: 'https://marketplace.example.com/admin',
        lastModified: '2026-06-08T12:00:00.000Z',
        changeFrequency: 'weekly',
        priority: 0.1,
      },
      {
        loc: 'https://marketplace.example.com/products/product-1',
        lastModified: '2026-06-08T12:00:00.000Z',
        changeFrequency: 'daily',
        priority: 0.8,
      },
    ] as never)

    const result = await sitemap()

    expect(result).toHaveLength(2)
    expect(result.map((entry) => entry.url)).toEqual([
      'https://marketplace.example.com/',
      'https://marketplace.example.com/products/product-1',
    ])
  })
})
