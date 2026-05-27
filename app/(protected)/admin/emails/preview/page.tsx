import { notFound } from 'next/navigation'
import AdminSection from '@/components/admin/AdminSection'
import EmailTemplatePreviewList from '@/components/admin/EmailTemplatePreviewList'

export default function AdminEmailPreviewPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return (
    <AdminSection
      eyebrow="Developer tooling"
      title="Transactional email preview"
      description="Preview the current React Email templates with safe sample data. This route is available only in development and never sends real email."
    >
      <EmailTemplatePreviewList />
    </AdminSection>
  )
}
