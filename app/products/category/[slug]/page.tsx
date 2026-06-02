import { notFound } from 'next/navigation'
import SearchResultsPageClient from '@/components/search/SearchResultsPageClient'
import SearchErrorState from '@/components/search/SearchErrorState'
import { fetchCategories } from '@/components/category/category.server'
import {
  getSearchPageData,
  type SearchPageSearchParams,
} from '@/app/search/_lib/search-page.data'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchPageSearchParams>
}

export default async function CategoryProductsPage({
  params,
  searchParams,
}: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const categories = await fetchCategories()
  const category = categories.find((item) => item.slug === slug)

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
        resetHref={`/products/category/${slug}`}
      />
    )
  }

  return (
    <SearchResultsPageClient
      title={category.name}
      subtitle="Фільтруйте товари в категорії та знаходьте найкращі пропозиції."
      pathname={`/products/category/${slug}`}
      results={data.results}
      state={data.state}
      categoryTree={data.categoryTree}
      flatCategories={data.flatCategories}
      lockedCategory={{ slug: category.slug, name: category.name }}
    />
  )
}
