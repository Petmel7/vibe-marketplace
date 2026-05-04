import { notFound } from 'next/navigation'
import { findCategoryTreeNodeBySlugPath } from '@/components/category/category.data'
import { fetchCategoryTree } from '@/components/category/category.server'
import ProductCardGrid from '@/components/product/ProductCardGrid'
import { listProducts } from '@/features/products/product.service'

interface Props {
  params: Promise<{ slug: string[] }>
}

export default async function CatalogCategoryPage({ params }: Props) {
  const { slug } = await params
  const categories = await fetchCategoryTree()
  const category = findCategoryTreeNodeBySlugPath(categories, slug)

  if (!category) {
    notFound()
  }

  const result = await listProducts({
    category: category.slug,
    sort: 'newest',
    page: 1,
    limit: 12,
  })

  return (
    <main className="pt-4 pb-24 md:pb-12">
      <section className="space-y-6">
        <h1 className="ui-heading-page">{category.name}</h1>

        {result.items.length > 0 ? (
          <ProductCardGrid products={result.items} />
        ) : (
          <p className="ui-body-muted">У цій категорії поки що немає товарів.</p>
        )}
      </section>
    </main>
  )
}
