import type { Metadata } from 'next'
import CategoryCards from '@/components/category/CategoryCards'
import { fetchCategories } from '@/components/category/category.server'
import { getCachedPageSeo } from '@/app/_lib/seo.data'
import { buildStaticPageMetadata } from '@/lib/seo/metadata'

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getCachedPageSeo('categories')

  return buildStaticPageMetadata(seo, {
    fallbackPath: '/categories',
    fallbackTitle: 'Категорії товарів | Marketplace',
    fallbackDescription: 'Оберіть категорію одягу, взуття та аксесуарів для зручного перегляду товарів на Marketplace.',
  })
}

export default async function CategoriesPage() {
  const categories = await fetchCategories()

  return (
    <main className="pt-4 pb-24 md:pb-12">
      <section className="space-y-6">
        {categories.length > 0 ? (
          <CategoryCards categories={categories} layout="grid" />
        ) : (
          <p className="ui-body-muted">Категорії поки що відсутні.</p>
        )}
      </section>
    </main>
  )
}
