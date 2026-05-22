import { notFound } from 'next/navigation'
import { findCategoryTreeNodeBySlugPath } from '@/components/category/category.data'
import { fetchCategoryTree } from '@/components/category/category.server'
import ProductCardGrid from '@/components/product/ProductCardGrid'
import { isRenderablePublicProduct } from '@/components/product/productListItem'
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

  const visibleProducts = result.items.filter(isRenderablePublicProduct)

  return (
    <main className="pb-24 pt-4 md:pb-12">
      <section className="space-y-6">
        <h1 className="ui-heading-page">{category.name}</h1>

        {visibleProducts.length > 0 ? (
          <ProductCardGrid products={visibleProducts} />
        ) : (
          <p className="ui-body-muted">РЈ С†С–Р№ РєР°С‚РµРіРѕСЂС–С— РїРѕРєРё С‰Рѕ РЅРµРјР°С” С‚РѕРІР°СЂС–РІ.</p>
        )}
      </section>
    </main>
  )
}
