import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminSection from '@/components/admin/AdminSection'
import CommissionPreviewCard from '@/components/commissions/CommissionPreviewCard'
import CommissionRuleForm from '@/components/commissions/CommissionRuleForm'
import CommissionRuleStatusBadge from '@/components/commissions/CommissionRuleStatusBadge'
import DashboardCard from '@/components/profile/DashboardCard'
import { getAdminCommissionRuleDetailPageData } from '@/app/(protected)/admin/_lib/admin-commission-rules.data'
import { getCurrentUser } from '@/lib/session/getSession'
import {
  getCommissionRuleScopeLabel,
  getCommissionRuleSpecificityLabel,
} from '@/types/commissions'

export default async function AdminCommissionRuleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const { id } = await params
  const data = await getAdminCommissionRuleDetailPageData(user, id)

  if (!data) {
    notFound()
  }

  return (
    <AdminSection
      eyebrow="Finance"
      title={data.rule.name}
      description="Review the active window, specificity, and priority before updating a commission rule that future ledger generation will use."
    >
      <Link href="/admin/commission-rules" className="ui-link-muted">
        Back to commission rules
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <DashboardCard
            title="Rule summary"
            description="Specificity and priority determine whether this rule wins over other active commission policies."
            action={<CommissionRuleStatusBadge rule={data.rule} />}
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Scope</dt>
                <dd className="text-sm font-medium text-copy-strong">{getCommissionRuleScopeLabel(data.rule.scope)}</dd>
                <p className="text-sm text-copy-muted">{getCommissionRuleSpecificityLabel(data.rule)}</p>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Rate</dt>
                <dd className="text-sm font-medium text-copy-strong">{data.rule.rate}</dd>
                <p className="text-sm text-copy-muted">{Number(data.rule.rate) * 100}% commission</p>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Starts</dt>
                <dd className="text-sm text-copy-secondary">{new Date(data.rule.startsAt).toLocaleString('uk-UA')}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Ends</dt>
                <dd className="text-sm text-copy-secondary">
                  {data.rule.endsAt ? new Date(data.rule.endsAt).toLocaleString('uk-UA') : 'No expiry'}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Priority</dt>
                <dd className="text-sm text-copy-secondary">{data.rule.priority}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Created by</dt>
                <dd className="text-sm text-copy-secondary">{data.rule.createdByEmail ?? 'Unknown admin'}</dd>
              </div>
            </dl>
          </DashboardCard>

          <CommissionPreviewCard stores={data.stores} categories={data.categories} />
        </div>

        <CommissionRuleForm
          mode="edit"
          initialRule={data.rule}
          stores={data.stores}
          categories={data.categories}
        />
      </div>
    </AdminSection>
  )
}
