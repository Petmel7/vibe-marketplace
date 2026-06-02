import SearchResultsPageClient from '@/components/search/SearchResultsPageClient'
import SearchErrorState from '@/components/search/SearchErrorState'
import {
  getSearchPageData,
  type SearchPageSearchParams,
} from '@/app/search/_lib/search-page.data'

interface CatalogPageProps {
  searchParams: Promise<SearchPageSearchParams>
}

export default async function Catalog({ searchParams }: CatalogPageProps) {
  const resolvedSearchParams = await searchParams
  let data = null

  try {
    data = await getSearchPageData(resolvedSearchParams)
  } catch {
    return <SearchErrorState />
  }

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
