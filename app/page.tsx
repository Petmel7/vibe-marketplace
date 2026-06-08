import type { Metadata } from 'next'
import { Suspense } from 'react'
import HomeProductSection from '@/components/product/HomeProductSection'
import ProductCardSkeleton from '@/components/product/ProductCardSkeleton'
import { getCachedGlobalSeo } from '@/app/_lib/seo.data'
import { buildHomeMetadata } from '@/lib/seo/metadata'

function HomeSectionSkeleton({ title }: { title: string }) {
  return (
    <section className="space-y-4">
      <h2 className="ui-heading-section mb-0">{title}</h2>
      <ProductCardSkeleton count={4} />
    </section>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getCachedGlobalSeo()
  return buildHomeMetadata(seo)
}

export default async function Home() {
  return (
    <main>
      <div className="space-y-10">
        <Suspense fallback={<HomeSectionSkeleton title="Новинки" />}>
          <HomeProductSection type="new" title="Новинки" />
        </Suspense>

        <Suspense fallback={<HomeSectionSkeleton title="Хіти" />}>
          <HomeProductSection type="hit" title="Хіти" />
        </Suspense>
      </div>
    </main>
  )
}
