import Link from 'next/link'
import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import StatusFilter from '@/components/admin/StatusFilter'
import HeroBannerTable from '@/components/hero-banners/HeroBannerTable'
import { getAdminHeroBannersPageData } from '@/app/(protected)/admin/_lib/admin-hero-banners.data'
import { getCurrentUser } from '@/lib/session/getSession'
import {
  HERO_BANNER_DESTINATION_TYPES,
  HERO_BANNER_STATUSES,
  getHeroBannerDestinationTypeLabel,
  getHeroBannerStatusLabel,
} from '@/types/hero-banners'

export default async function AdminHeroBannersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const data = await getAdminHeroBannersPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Hero-банери"
      title="Керування Hero-банерами"
      description="Створюйте та впорядковуйте банери для майбутнього головного Hero-блоку без зміни публічної сторінки на цьому етапі."
    >
      <div className="flex justify-center max-[500px]:block">
        <Link href="/admin/hero-banners/new" className="ui-primary-button max-[500px]:w-full">
          Створити Hero-банер
        </Link>
      </div>

      <AdminFilterBar action="/admin/hero-banners">
        <div className="flex w-full flex-col items-center gap-3 max-[500px]:items-stretch">
          <div className="flex w-full flex-col items-center gap-3 max-[500px]:items-stretch min-[1146px]:flex-row min-[1146px]:items-end min-[1146px]:justify-center">
            <div className="w-full max-w-md max-[500px]:max-w-none">
              <StatusFilter
                name="status"
                label="Статус"
                defaultValue={data.filters.status}
                options={HERO_BANNER_STATUSES.map((status) => ({
                  label: getHeroBannerStatusLabel(status),
                  value: status,
                }))}
              />
            </div>
            <div className="w-full max-w-md max-[500px]:max-w-none">
              <StatusFilter
                name="destinationType"
                label="Тип переходу"
                defaultValue={data.filters.destinationType}
                options={HERO_BANNER_DESTINATION_TYPES.map((type) => ({
                  label: getHeroBannerDestinationTypeLabel(type),
                  value: type,
                }))}
              />
            </div>
          </div>
          <button type="submit" className="ui-primary-button max-[500px]:w-full">
            Застосувати фільтри
          </button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Hero-банери"
        description="Переглядайте статуси, періоди публікації, порядок показу та швидкі дії для кожного банера."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="Hero-банерів ще немає"
              description="Створіть перший банер, щоб підготувати контент для майбутнього Hero-блоку головної сторінки."
              actionHref="/admin/hero-banners/new"
              actionLabel="Створити Hero-банер"
            />
          </div>
        ) : (
          <HeroBannerTable items={data.items} />
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/hero-banners"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          status: data.filters.status,
          destinationType: data.filters.destinationType,
          limit: String(data.limit),
        }}
      />
    </AdminSection>
  )
}
