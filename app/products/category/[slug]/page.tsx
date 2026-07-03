import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SearchResultsPageClient from '@/components/search/SearchResultsPageClient'
import SearchErrorState from '@/components/search/SearchErrorState'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import { fetchCategories } from '@/components/category/category.server'
import {
  getSearchPageData,
  type SearchPageSearchParams,
} from '@/app/search/_lib/search-page.data'
import { getCachedCategorySeo } from '@/app/_lib/seo.data'
import { buildCategoryMetadata } from '@/lib/seo/metadata'
import { SeoEntityNotFoundError } from '@/lib/errors/seo'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchPageSearchParams>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  try {
    const seo = await getCachedCategorySeo(slug)
    return buildCategoryMetadata(seo)
  } catch (error) {
    if (error instanceof SeoEntityNotFoundError) {
      notFound()
    }

    throw error
  }
}

export default async function CategoryProductsPage({
  params,
  searchParams,
}: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  let seo: Awaited<ReturnType<typeof getCachedCategorySeo>>

  try {
    seo = await getCachedCategorySeo(slug)
  } catch (error) {
    if (error instanceof SeoEntityNotFoundError) {
      notFound()
    }

    throw error
  }
  const categories = await fetchCategories()
  const category = categories.find((item) => item.slug === slug)

  if (!category) {
    notFound()
  }

  let data = null

  try {
    data = await getSearchPageData(resolvedSearchParams, {
      category: category.slug,
    }, {
      preloadedFlatCategories: categories,
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
    <>
      <BreadcrumbJsonLd data={seo.breadcrumbJsonLd} />
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
    </>
  )
}
