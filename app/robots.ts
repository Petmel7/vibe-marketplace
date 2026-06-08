import type { MetadataRoute } from 'next'
import { getCachedRobotsConfig } from '@/app/_lib/seo.data'
import { SEO_ROBOTS_REVALIDATE_SECONDS } from '@/features/seo/seo.cache'

export const revalidate = SEO_ROBOTS_REVALIDATE_SECONDS

export default async function robots(): Promise<MetadataRoute.Robots> {
  const config = await getCachedRobotsConfig()
  const disallow = Array.from(
    new Set([
      ...config.disallow,
      '/notifications',
      '/auth',
    ]),
  )

  return {
    rules: {
      userAgent: '*',
      allow: config.allow,
      disallow,
    },
    sitemap: config.sitemapUrl,
  }
}
