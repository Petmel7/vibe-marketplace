import type { MetadataRoute } from 'next'
import { getCachedSitemapEntries } from '@/app/_lib/seo.data'
import { SEO_SITEMAP_REVALIDATE_SECONDS } from '@/features/seo/seo.cache'
import type { SitemapEntryDto } from '@/features/seo/seo.dto'

export const revalidate = SEO_SITEMAP_REVALIDATE_SECONDS

const DISALLOWED_SITEMAP_PATHS = new Set([
  '/search',
  '/catalog',
])

function isPublicSitemapPath(pathname: string) {
  if (DISALLOWED_SITEMAP_PATHS.has(pathname)) {
    return false
  }

  return ![
    '/admin',
    '/seller',
    '/profile',
    '/checkout',
    '/api',
    '/internal',
    '/notifications',
    '/auth',
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getCachedSitemapEntries()

  return entries
    .filter((entry: SitemapEntryDto) => {
      const pathname = new URL(entry.loc).pathname
      return isPublicSitemapPath(pathname)
    })
    .map((entry: SitemapEntryDto) => ({
      url: entry.loc,
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    }))
}
