import AdminCategoryTree from '@/components/admin/AdminCategoryTree'
import AdminSection from '@/components/admin/AdminSection'

export default function AdminCategoriesPage() {
  return (
    <AdminSection
      eyebrow="Таксономія"
      title="Категорії маркетплейсу"
      description="Формуйте дерево категорій для продавців, керуйте ієрархією батьківських і дочірніх категорій та підтримуйте передбачуваний порядок у всьому маркетплейсі."
    >
      <AdminCategoryTree />
    </AdminSection>
  )
}
