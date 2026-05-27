import Link from 'next/link'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import EmailDiagnosticsTable from '@/components/admin/EmailDiagnosticsTable'
import PaginationControls from '@/components/admin/PaginationControls'
import StatusFilter from '@/components/admin/StatusFilter'
import { getAdminEmailsPageData } from '@/app/(protected)/admin/_lib/admin-email.data'
import { getCurrentUser } from '@/lib/session/getSession'
import {
  ADMIN_EMAIL_EVENT_STATUSES,
  ADMIN_EMAIL_EVENT_TYPES,
  ADMIN_EMAIL_TEMPLATE_KEYS,
} from '@/types/admin-emails'

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const rawSearchParams = await searchParams
  const data = await getAdminEmailsPageData(user, rawSearchParams)

  return (
    <AdminSection
      eyebrow="Email operations"
      title="Transactional email diagnostics"
      description="Review marketplace email events, inspect provider delivery outcomes, and retry failed transactional sends without leaving the admin workspace."
    >
      <AdminFilterBar action="/admin/emails">
        <StatusFilter
          name="status"
          label="Event status"
          defaultValue={data.filters.status}
          options={ADMIN_EMAIL_EVENT_STATUSES.map((status) => ({
            label: status.replaceAll('_', ' '),
            value: status,
          }))}
        />
        <StatusFilter
          name="eventType"
          label="Event type"
          defaultValue={data.filters.eventType}
          options={ADMIN_EMAIL_EVENT_TYPES.map((eventType) => ({
            label: eventType.replaceAll('_', ' '),
            value: eventType,
          }))}
        />
        <StatusFilter
          name="template"
          label="Template"
          defaultValue={data.filters.template}
          options={ADMIN_EMAIL_TEMPLATE_KEYS.map((template) => ({
            label: template.replaceAll('_', ' '),
            value: template,
          }))}
        />
        <div className="flex flex-wrap gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Apply filters</button>
          {process.env.NODE_ENV === 'development' ? (
            <Link href="/admin/emails/preview" className="ui-secondary-button">
              Open template preview
            </Link>
          ) : null}
        </div>
      </AdminFilterBar>

      <EmailDiagnosticsTable items={data.items} />

      <PaginationControls
        pathname="/admin/emails"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          status: data.filters.status,
          eventType: data.filters.eventType,
          template: data.filters.template,
          limit: String(data.limit),
        }}
      />
    </AdminSection>
  )
}
