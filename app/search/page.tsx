import type { Metadata } from 'next'
import SearchResultsPageClient from '@/components/search/SearchResultsPageClient'
import SearchErrorState from '@/components/search/SearchErrorState'
import {
  getSearchPageData,
  type SearchPageSearchParams,
} from './_lib/search-page.data'
import { getCachedPageSeo } from '@/app/_lib/seo.data'
import { buildSearchMetadata } from '@/lib/seo/metadata'

interface SearchPageProps {
  searchParams: Promise<SearchPageSearchParams>
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const [seo, resolvedSearchParams] = await Promise.all([
    getCachedPageSeo('search'),
    searchParams,
  ])
  const rawQuery = resolvedSearchParams.q
  const query = Array.isArray(rawQuery) ? rawQuery[0] ?? null : rawQuery ?? null

  return buildSearchMetadata(seo, query)
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
