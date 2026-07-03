import { unstable_cache } from 'next/cache'
import { SEO_CACHE_TAGS } from '@/features/seo/seo.cache'
import { listActiveCategoryTraversalNodes } from './category.repository'

const ACTIVE_CATEGORY_TRAVERSAL_REVALIDATE_SECONDS = 60 * 5

const getActiveCategoryTraversalNodesCachedInternal = unstable_cache(
  async () => listActiveCategoryTraversalNodes(),
  ['active-category-traversal-nodes'],
  {
    revalidate: ACTIVE_CATEGORY_TRAVERSAL_REVALIDATE_SECONDS,
    tags: [SEO_CACHE_TAGS.categories],
  },
)

export async function getActiveCategoryTraversalNodesCached() {
  return getActiveCategoryTraversalNodesCachedInternal()
}
