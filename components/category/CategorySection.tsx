import Link from 'next/link'
import CategoryCards from '@/components/category/CategoryCards'
import { fetchCategories } from '@/components/category/category.server'
import { ArrowDownRight } from 'lucide-react';

export default async function CategorySection() {
  const categories = await fetchCategories()

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="ui-heading-product">Категорії</h2>
        <Link href="/categories" className="flex items-center gap-1 text-[14px] font-normal text-copy-muted">
          <p>Дивитися все</p>
          <ArrowDownRight />
        </Link>
      </div>

      {categories.length > 0 ? (
        <CategoryCards categories={categories} maxItems={4} />
      ) : (
        <p className="ui-body-muted">Категорії поки що відсутні.</p>
      )}
    </section>
  )
}
