import { unstable_cache } from 'next/cache'
import { SEO_CACHE_TAGS } from '@/features/seo/seo.cache'
import { getCurrentRequestTrace } from '@/lib/observability/request-trace'
import { logInfo } from '@/utils/logger'
import { listActiveCategoryTraversalNodes } from './category.repository'

const ACTIVE_CATEGORY_TRAVERSAL_REVALIDATE_SECONDS = 60 * 5
let categoryTraversalRebuildPromise: Promise<
  Awaited<ReturnType<typeof listActiveCategoryTraversalNodes>>
> | null = null

const getActiveCategoryTraversalNodesCachedInternal = unstable_cache(
  async () => {
    const trace = getCurrentRequestTrace()
    logInfo('categories:traversal-cache-callback:before', {
      domain: 'categories',
      cache: 'unstable_cache:active-category-traversal-nodes',
      requestId: trace?.requestId ?? null,
      route: trace?.route ?? null,
      requestOperation: trace?.operation ?? null,
      cacheExecution: trace ? 'request' : 'background',
    })

    if (categoryTraversalRebuildPromise) {
      logInfo('categories:traversal-cache-callback:join-existing-rebuild', {
        domain: 'categories',
        cache: 'unstable_cache:active-category-traversal-nodes',
        requestId: trace?.requestId ?? null,
        route: trace?.route ?? null,
        requestOperation: trace?.operation ?? null,
        cacheExecution: trace ? 'request' : 'background',
      })
      return categoryTraversalRebuildPromise
    }

    categoryTraversalRebuildPromise = listActiveCategoryTraversalNodes()

    try {
      const result = await categoryTraversalRebuildPromise
      logInfo('categories:traversal-cache-callback:after', {
        domain: 'categories',
        cache: 'unstable_cache:active-category-traversal-nodes',
        requestId: trace?.requestId ?? null,
        route: trace?.route ?? null,
        requestOperation: trace?.operation ?? null,
        cacheExecution: trace ? 'request' : 'background',
        count: result.length,
      })
      return result
    } finally {
      categoryTraversalRebuildPromise = null
    }
  },
  ['active-category-traversal-nodes'],
  {
    revalidate: ACTIVE_CATEGORY_TRAVERSAL_REVALIDATE_SECONDS,
    tags: [SEO_CACHE_TAGS.categories],
  },
)

export async function getActiveCategoryTraversalNodesCached() {
  return getActiveCategoryTraversalNodesCachedInternal()
}
