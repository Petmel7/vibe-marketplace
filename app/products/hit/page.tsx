import InfiniteProductList from '@/components/product/InfiniteProductList'
import { listHitProducts } from '@/features/products/product.service'

export default async function HitProductsPage() {
  const result = await listHitProducts({ page: 1, limit: 12 })

  return (
    <main className="pt-4 pb-24 md:pb-12">
      <section className="space-y-6">
        <h1 className="ui-heading-page">Хіти</h1>
        <InfiniteProductList
          type="hit"
          initialProducts={result.data}
          initialPage={result.meta.page}
          initialHasNextPage={result.meta.hasNextPage}
          emptyMessage="Хіти поки що відсутні."
        />
      </section>
    </main>
  )
}
