import AdminCategoryTree from '@/components/admin/AdminCategoryTree'
import AdminSection from '@/components/admin/AdminSection'

export default function AdminCategoriesPage() {
  return (
    <AdminSection
      eyebrow="Taxonomy"
      title="Marketplace categories"
      description="Shape the seller-facing category tree, manage parent-child hierarchy, and keep taxonomy ordering deterministic across the marketplace."
    >
      <AdminCategoryTree />
    </AdminSection>
  )
}
