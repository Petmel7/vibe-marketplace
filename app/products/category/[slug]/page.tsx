import { notFound } from 'next/navigation'
import ProductCardGrid from '@/components/product/ProductCardGrid'
import { fetchCategories } from '@/components/category/category.server'
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

  return (
    <main className="pt-4 pb-24 md:pb-12">
      <section className="space-y-6">
        <h1 className="ui-heading-page">{category.name}</h1>

        {result.data.length > 0 ? (
          <ProductCardGrid products={result.data} />
        ) : (
          <p className="ui-body-muted">У цій категорії поки що немає товарів.</p>
        )}
      </section>
    </main>
  )
}
