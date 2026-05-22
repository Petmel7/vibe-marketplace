import { notFound } from 'next/navigation'
import ProductCardGrid from '@/components/product/ProductCardGrid'
import { fetchCategories } from '@/components/category/category.server'
import { isRenderablePublicProduct } from '@/components/product/productListItem'
import { listProductsByCategorySlug } from '@/features/products/product.service'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CategoryProductsPage({ params }: Props) {
  const { slug } = await params
  const [categories, result] = await Promise.all([
    fetchCategories(),
    listProductsByCategorySlug(slug, { page: 1, limit: 12 }),
  ])

  const category = categories.find((item) => item.slug === slug)

  if (!category) {
    notFound()
  }

  const visibleProducts = result.data.filter(isRenderablePublicProduct)

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
