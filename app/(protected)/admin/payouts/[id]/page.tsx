import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminSection from '@/components/admin/AdminSection'
import AdminPayoutDetailCard from '@/components/finance/AdminPayoutDetailCard'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminPayoutDetailPageData } from '@/app/(protected)/admin/_lib/admin-payouts.data'

export default async function AdminPayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params
  const payout = await getAdminPayoutDetailPageData(user, id)

  if (!payout) {
    notFound()
  }

  return (
    <AdminSection
      eyebrow="Seller finance"
      title={`Payout #${payout.id.slice(0, 8)}`}
      description="Inspect payout metadata, review included ledger entries, and update payout state with explicit confirmation."
    >
      <Link href="/admin/payouts" className="ui-link-muted">
        Back to payouts
      </Link>
      <AdminPayoutDetailCard payout={payout} />
    </AdminSection>
  )
}
