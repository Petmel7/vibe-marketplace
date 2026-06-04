import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminSection from '@/components/admin/AdminSection'
import AdminRefundActionPanel from '@/components/refunds/AdminRefundActionPanel'
import RefundDetailCard from '@/components/refunds/RefundDetailCard'
import RefundTimeline from '@/components/refunds/RefundTimeline'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminRefundDetailPageData } from '@/app/(protected)/admin/_lib/admin-refunds.data'

export default async function AdminRefundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params
  const refund = await getAdminRefundDetailPageData(user, id)

  if (!refund) {
    notFound()
  }

  return (
    <AdminSection
      eyebrow="Refund details"
      title={`Повернення #${refund.id.slice(0, 8)}`}
      description="Переглядайте buyer request, audit trail, refund record та застосовуйте лише дозволені backend transitions."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/refunds" className="ui-link-muted">
          Назад до черги
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_360px]">
        <div className="space-y-6">
          <RefundDetailCard refund={refund} title="Контекст запиту" />
          <RefundTimeline refund={refund} />
        </div>

        <div className="space-y-6">
          <AdminRefundActionPanel refund={refund} />
        </div>
      </div>
    </AdminSection>
  )
}
