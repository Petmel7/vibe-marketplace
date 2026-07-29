import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import type { HeroBannerStatus } from '@/types/hero-banners'
import { getHeroBannerStatusLabel } from '@/types/hero-banners'

function getTone(status: HeroBannerStatus) {
  switch (status) {
    case 'PUBLISHED':
      return 'success'
    case 'PAUSED':
      return 'warning'
    case 'ARCHIVED':
      return 'neutral'
    case 'DRAFT':
    default:
      return 'info'
  }
}

export default function HeroBannerStatusBadge({ status }: { status: HeroBannerStatus }) {
  return <AdminStatusBadge label={getHeroBannerStatusLabel(status)} tone={getTone(status)} />
}
