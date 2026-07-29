import Link from 'next/link'
import AdminSection from '@/components/admin/AdminSection'
import HeroBannerForm from '@/components/hero-banners/HeroBannerForm'
import { getCurrentUser } from '@/lib/session/getSession'

export default async function AdminNewHeroBannerPage() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  return (
    <AdminSection
      eyebrow="Hero-банери"
      title="Новий Hero-банер"
      description="Підготуйте банер, зображення, CTA та період публікації для майбутнього Hero-блоку."
    >
      <Link href="/admin/hero-banners" className="ui-link-muted">
        Назад до Hero-банерів
      </Link>

      <HeroBannerForm mode="create" />
    </AdminSection>
  )
}
