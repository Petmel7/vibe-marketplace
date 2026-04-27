import CategoryCards from '@/components/category/CategoryCards'
import { fetchCategories } from '@/components/category/category.data'

export default async function CategoriesPage() {
  const categories = await fetchCategories()

  return (
    <main className="ui-page-shell pt-4 pb-24 md:pb-12">
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
