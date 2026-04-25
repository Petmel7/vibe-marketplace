import InfiniteProductList from '@/components/product/InfiniteProductList'
import { listNewProducts } from '@/features/products/product.service'

export default async function NewProductsPage() {
  const result = await listNewProducts({ page: 1, limit: 12 })

  return (
    <main className="pt-4 pb-24 md:pb-12">
      <section className="space-y-6">
        <h1 className="ui-heading-page">Новинки</h1>
        <InfiniteProductList
          type="new"
          initialProducts={result.data}
          initialPage={result.meta.page}
          initialHasNextPage={result.meta.hasNextPage}
          emptyMessage="Новинки поки що відсутні."
        />
      </section>
    </main>
  )
}
