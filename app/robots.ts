import type { MetadataRoute } from 'next'
import { getCachedRobotsConfig } from '@/app/_lib/seo.data'

export const revalidate = 86400
export const dynamic = 'force-dynamic'

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
