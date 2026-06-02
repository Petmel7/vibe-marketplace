import { notFound } from 'next/navigation'
import SearchResultsPageClient from '@/components/search/SearchResultsPageClient'
import SearchErrorState from '@/components/search/SearchErrorState'
import { findCategoryTreeNodeBySlugPath } from '@/components/category/category.data'
import { fetchCategoryTree } from '@/components/category/category.server'
import {
  getSearchPageData,
  type SearchPageSearchParams,
} from '@/app/search/_lib/search-page.data'

interface Props {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<SearchPageSearchParams>
}

export default async function CatalogCategoryPage({
  params,
  searchParams,
}: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const categories = await fetchCategoryTree()
  const category = findCategoryTreeNodeBySlugPath(categories, slug)

  if (!category) {
    notFound()
  }

  let data = null

  try {
    data = await getSearchPageData(resolvedSearchParams, {
      category: category.slug,
    })
  } catch {
    return (
      <SearchErrorState
        title="Не вдалося завантажити товари категорії"
        resetHref={`/catalog/${slug.join('/')}`}
      />
    )
  }

  return (
    <SearchResultsPageClient
      title={category.name}
      subtitle="Переглядайте доступні товари в категорії та уточнюйте результати фільтрами."
      pathname={`/catalog/${slug.join('/')}`}
      results={data.results}
      state={data.state}
      categoryTree={data.categoryTree}
      flatCategories={data.flatCategories}
      lockedCategory={{ slug: category.slug, name: category.name }}
    />
  )
}
