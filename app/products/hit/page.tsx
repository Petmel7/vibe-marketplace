import type { Metadata } from 'next'
import InfiniteProductList from '@/components/product/InfiniteProductList'
import { getInitialHitProductsPage } from '@/features/products/product.service'
import { getCachedPageSeo } from '@/app/_lib/seo.data'
import { buildStaticPageMetadata } from '@/lib/seo/metadata'
import { logInfo } from '@/utils/logger'

export async function generateMetadata(): Promise<Metadata> {
  logInfo('products-hit:generateMetadata:before', {
    domain: 'seo',
    route: '/products/hit',
  })
  const seo = await getCachedPageSeo('products-hit')
  logInfo('products-hit:generateMetadata:after', {
    domain: 'seo',
    route: '/products/hit',
  })

  return buildStaticPageMetadata(seo, {
    fallbackPath: '/products/hit',
    fallbackTitle: 'Хіти продажу | Marketplace',
    fallbackDescription: 'Популярні товари Marketplace: хіти продажу одягу, взуття та аксесуарів.',
  })
}

export default async function HitProductsPage() {
  logInfo('products-hit:page:before-service', {
    domain: 'products',
    route: '/products/hit',
  })
  const result = await getInitialHitProductsPage(12)
  logInfo('products-hit:page:after-service', {
    domain: 'products',
    route: '/products/hit',
    itemCount: result.items.length,
    hasNextPage: result.hasNextPage,
  })

  return (
    <main className="pt-4 pb-24 md:pb-12">
      <section className="space-y-6">
        <h1 className="ui-heading-page">Хіти</h1>
        <InfiniteProductList
          type="hit"
          initialProducts={result.items}
          initialPage={result.page}
          initialHasNextPage={result.hasNextPage}
          emptyMessage="Хіти поки що відсутні."
        />
      </section>
    </main>
  )
}
