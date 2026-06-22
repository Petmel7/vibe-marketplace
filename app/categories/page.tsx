import type { Metadata } from 'next'
import CategoryCards from '@/components/category/CategoryCards'
import { fetchCategories } from '@/components/category/category.server'
import { getCachedPageSeo } from '@/app/_lib/seo.data'
import { buildStaticPageMetadata } from '@/lib/seo/metadata'

export const dynamic = 'force-dynamic'

const CATEGORY_PAGE_FALLBACK_TITLE = 'Категорії товарів | Marketplace'
const CATEGORY_PAGE_FALLBACK_DESCRIPTION =
  'Оберіть категорію одягу, взуття та аксесуарів для зручного перегляду товарів на Marketplace.'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const seo = await getCachedPageSeo('categories')

    return buildStaticPageMetadata(seo, {
      fallbackPath: '/categories',
      fallbackTitle: CATEGORY_PAGE_FALLBACK_TITLE,
      fallbackDescription: CATEGORY_PAGE_FALLBACK_DESCRIPTION,
    })
  } catch {
    return {
      title: CATEGORY_PAGE_FALLBACK_TITLE,
      description: CATEGORY_PAGE_FALLBACK_DESCRIPTION,
    }
  }
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
