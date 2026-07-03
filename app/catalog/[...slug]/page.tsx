import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SearchResultsPageClient from '@/components/search/SearchResultsPageClient'
import SearchErrorState from '@/components/search/SearchErrorState'
import { findCategoryTreeNodeBySlugPath } from '@/components/category/category.data'
import { fetchCategoryTree } from '@/components/category/category.server'
import {
  getSearchPageData,
  type SearchPageSearchParams,
} from '@/app/search/_lib/search-page.data'
import { getCachedCategorySeo } from '@/app/_lib/seo.data'
import { buildCategoryMetadata } from '@/lib/seo/metadata'
import { SeoEntityNotFoundError } from '@/lib/errors/seo'

interface Props {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<SearchPageSearchParams>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const leafSlug = slug.at(-1)

  if (!leafSlug) {
    notFound()
  }

  try {
    const seo = await getCachedCategorySeo(leafSlug)
    const metadata = buildCategoryMetadata(seo)

    return {
      ...metadata,
      robots: {
        index: false,
        follow: true,
      },
    }
  } catch (error) {
    if (error instanceof SeoEntityNotFoundError) {
      notFound()
    }

    throw error
  }
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
    }, {
      preloadedCategoryTree: categories,
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
