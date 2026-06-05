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
      eyebrow="Finance"
      title="Create commission rule"
      description="Set up a new global, category, or store override without changing historical commission snapshots on existing orders."
    >
      <Link href="/admin/commission-rules" className="ui-link-muted">
        Back to commission rules
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <CommissionRuleForm mode="create" stores={data.stores} categories={data.categories} />
        <CommissionPreviewCard stores={data.stores} categories={data.categories} />
      </div>
    </AdminSection>
  )
}
