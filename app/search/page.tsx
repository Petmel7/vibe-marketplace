import SearchResultsPageClient from '@/components/search/SearchResultsPageClient'
import SearchErrorState from '@/components/search/SearchErrorState'
import {
  getSearchPageData,
  type SearchPageSearchParams,
} from './_lib/search-page.data'

interface SearchPageProps {
  searchParams: Promise<SearchPageSearchParams>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams
  let data = null

  try {
    data = await getSearchPageData(resolvedSearchParams)
  } catch {
    return (
      <SearchErrorState
        title="Пошук тимчасово недоступний"
        message="Не вдалося завантажити результати пошуку. Спробуйте ще раз трохи пізніше."
        resetHref="/search"
      />
    )
  }

  return (
    <SearchResultsPageClient
      title="Пошук товарів"
      subtitle="Фільтруйте результати за категорією, ціною, рейтингом і наявністю."
      pathname="/search"
      results={data.results}
      state={data.state}
      categoryTree={data.categoryTree}
      flatCategories={data.flatCategories}
    />
  )
}
