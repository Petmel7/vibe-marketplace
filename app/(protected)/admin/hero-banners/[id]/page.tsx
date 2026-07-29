import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminSection from '@/components/admin/AdminSection'
import HeroBannerForm from '@/components/hero-banners/HeroBannerForm'
import { getAdminHeroBannerDetailPageData } from '@/app/(protected)/admin/_lib/admin-hero-banners.data'
import { getCurrentUser } from '@/lib/session/getSession'

export default async function AdminHeroBannerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const { id } = await params
  const banner = await getAdminHeroBannerDetailPageData(user, id)

  if (!banner) {
    notFound()
  }

  return (
    <AdminSection
      eyebrow="Hero-банери"
      title={banner.title}
      description="Редагуйте контент, зображення, CTA, період публікації та порядок показу Hero-банера."
    >
      <Link href="/admin/hero-banners" className="ui-link-muted">
        Назад до Hero-банерів
      </Link>

      <HeroBannerForm mode="edit" initialBanner={banner} />
    </AdminSection>
  )
}
