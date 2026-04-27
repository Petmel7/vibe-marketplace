
import { Suspense } from 'react'
import CategorySection from '@/components/category/CategorySection'
import HomeProductSection from '@/components/product/HomeProductSection'
import ProductCardSkeleton from '@/components/product/ProductCardSkeleton'

function HomeSectionSkeleton({ title }: { title: string }) {
  return (
    <section className="space-y-4">
      <h2 className="ui-heading-section mb-0">{title}</h2>
      <ProductCardSkeleton count={4} />
    </section>
  )
}

export default async function Home() {
  return (
    <main className="pt-4 pb-24 md:pb-12">
      <div className="space-y-10">
        <CategorySection />

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
