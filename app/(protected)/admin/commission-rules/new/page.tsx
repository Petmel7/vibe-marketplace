import Link from 'next/link'
import AdminSection from '@/components/admin/AdminSection'
import CommissionPreviewCard from '@/components/commissions/CommissionPreviewCard'
import CommissionRuleForm from '@/components/commissions/CommissionRuleForm'
import { getAdminCommissionRuleCreatePageData } from '@/app/(protected)/admin/_lib/admin-commission-rules.data'
import { getCurrentUser } from '@/lib/session/getSession'

export default async function AdminCommissionRuleNewPage() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const data = await getAdminCommissionRuleCreatePageData(user)

  return (
    <AdminSection
      eyebrow="Фінанси"
      title="Створити правило комісії"
      description="Налаштуйте нове глобальне правило або перевизначення для категорії чи магазину без зміни історичних знімків комісії в існуючих замовленнях."
    >
      <Link href="/admin/commission-rules" className="ui-link-muted">
        Назад до правил комісій
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <CommissionRuleForm mode="create" stores={data.stores} categories={data.categories} />
        <CommissionPreviewCard stores={data.stores} categories={data.categories} />
      </div>
    </AdminSection>
  )
}
