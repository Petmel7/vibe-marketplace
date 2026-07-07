import SearchResultsPageClient from '@/components/search/SearchResultsPageClient'
import SearchErrorState from '@/components/search/SearchErrorState'
import {
  getSearchPageData,
  type SearchPageSearchParams,
} from '@/app/search/_lib/search-page.data'
import { logInfo } from '@/utils/logger'

interface CatalogPageProps {
  searchParams: Promise<SearchPageSearchParams>
}

export default async function Catalog({ searchParams }: CatalogPageProps) {
  const requestId = crypto.randomUUID()
  logInfo('catalog-page:start', {
    domain: 'catalog',
    route: '/catalog',
    requestId,
  })
  const resolvedSearchParams = await searchParams
  let data = null

  try {
    logInfo('catalog-page:before-data', {
      domain: 'catalog',
      route: '/catalog',
      requestId,
    })
    data = await getSearchPageData(resolvedSearchParams, {}, {
      traceContext: {
        requestId,
        route: '/catalog',
      },
    })
    logInfo('catalog-page:after-data', {
      domain: 'catalog',
      route: '/catalog',
      requestId,
      itemsCount: data.results.items.length,
      total: data.results.pagination.total,
    })
  } catch {
    return <SearchErrorState />
  }

  logInfo('catalog-page:before-return', {
    domain: 'catalog',
    route: '/catalog',
    requestId,
  })

  return (
    <SearchResultsPageClient
      title="Каталог"
      subtitle="Знайдіть товари за категорією, ціною, рейтингом і бейджами маркетплейсу."
      pathname="/catalog"
      results={data.results}
      state={data.state}
      categoryTree={data.categoryTree}
      flatCategories={data.flatCategories}
    />
  )
}
