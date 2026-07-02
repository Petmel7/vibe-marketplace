import type { Metadata } from 'next'
import InfiniteProductList from '@/components/product/InfiniteProductList'
import { getInitialNewProductsPage } from '@/features/products/product.service'
import { getCachedPageSeo } from '@/app/_lib/seo.data'
import { buildStaticPageMetadata } from '@/lib/seo/metadata'
import { logInfo } from '@/utils/logger'

export async function generateMetadata(): Promise<Metadata> {
  logInfo('products-new:generateMetadata:before', {
    domain: 'seo',
    route: '/products/new',
  })
  const seo = await getCachedPageSeo('products-new')
  logInfo('products-new:generateMetadata:after', {
    domain: 'seo',
    route: '/products/new',
  })

  return buildStaticPageMetadata(seo, {
    fallbackPath: '/products/new',
    fallbackTitle: 'Новинки | Marketplace',
    fallbackDescription: 'Свіжі новинки Marketplace: актуальний одяг, взуття та аксесуари з доставкою по Україні.',
  })
}

export default async function NewProductsPage() {
  logInfo('products-new:page:before-service', {
    domain: 'products',
    route: '/products/new',
  })
  const result = await getInitialNewProductsPage(12)
  logInfo('products-new:page:after-service', {
    domain: 'products',
    route: '/products/new',
    itemCount: result.items.length,
    hasNextPage: result.hasNextPage,
  })

  return (
    <main className="pt-4 pb-24 md:pb-12">
      <section className="space-y-6">
        <h1 className="ui-heading-page">Новинки</h1>
        <InfiniteProductList
          type="new"
          initialProducts={result.items}
          initialPage={result.page}
          initialHasNextPage={result.hasNextPage}
          emptyMessage="Новинки поки що відсутні."
        />
      </section>
    </main>
  )
}
