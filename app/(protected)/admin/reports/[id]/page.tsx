import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminSection from '@/components/admin/AdminSection'
import AdminReportDetail from '@/components/abuse-reports/AdminReportDetail'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminReportDetailPageData } from '@/app/(protected)/admin/_lib/admin-reports.data'

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params
  const report = await getAdminReportDetailPageData(user, id)

  if (!report) {
    notFound()
  }

  return (
    <AdminSection
      eyebrow="Trust & Safety"
      title={`Report #${report.id.slice(0, 8)}`}
      description="Inspect the report payload, review status, and apply audited moderation actions."
    >
      <Link href="/admin/reports" className="ui-link-muted">
        Back to reports
      </Link>
      <AdminReportDetail report={report} />
    </AdminSection>
  )
}
