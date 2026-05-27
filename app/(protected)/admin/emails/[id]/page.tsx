import Link from 'next/link'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminSection from '@/components/admin/AdminSection'
import EmailEventDetailCard from '@/components/admin/EmailEventDetailCard'
import { getAdminEmailDetailPageData } from '@/app/(protected)/admin/_lib/admin-email.data'
import { getCurrentUser } from '@/lib/session/getSession'

export default async function AdminEmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const { id } = await params
  const event = await getAdminEmailDetailPageData(user, id)

  return (
    <AdminSection
      eyebrow="Email operations"
      title="Transactional email event"
      description="Inspect queue payload, provider delivery history, and retry state for a single email event."
    >
      <div className="flex items-center">
        <Link href="/admin/emails" className="ui-secondary-button">
          Back to diagnostics
        </Link>
      </div>

      {event ? (
        <EmailEventDetailCard event={event} />
      ) : (
        <section className="ui-elevated-panel p-5 sm:p-6">
          <AdminEmptyState
            title="Email event not found"
            description="This email event does not exist anymore or could not be loaded from the diagnostics queue."
            actionHref="/admin/emails"
            actionLabel="Return to diagnostics"
          />
        </section>
      )}
    </AdminSection>
  )
}
