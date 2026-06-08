import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/_lib/seo.data', () => ({
  getCachedRobotsConfig: vi.fn(),
}))

import { getCachedRobotsConfig } from '@/app/_lib/seo.data'
import robots from './robots'

const mockGetCachedRobotsConfig = vi.mocked(getCachedRobotsConfig)

describe('app robots', () => {
  it('disallows protected routes and exposes sitemap url', async () => {
    mockGetCachedRobotsConfig.mockResolvedValue({
      sitemapUrl: 'https://marketplace.example.com/sitemap.xml',
      allow: ['/'],
      disallow: ['/admin', '/seller', '/profile', '/checkout', '/api', '/internal'],
    } as never)

    const result = await robots()
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules
    const disallow = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow]

    expect(disallow).toContain('/notifications')
    expect(disallow).toContain('/admin')
    expect(result.sitemap).toBe('https://marketplace.example.com/sitemap.xml')
  })
})
