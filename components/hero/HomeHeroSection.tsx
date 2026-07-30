import HomeHeroCarousel from '@/components/hero/HomeHeroCarousel'
import { getPublicHeroBanners } from '@/features/hero/hero.service'
import { logWarn } from '@/utils/logger'

const HOME_HERO_LIMIT = 5

export default async function HomeHeroSection() {
  const data = await getPublicHeroBanners({ limit: HOME_HERO_LIMIT }).catch((error) => {
    logWarn(
      'home-hero:load-failed',
      {
        domain: 'hero-banners',
        route: '/',
      },
      error,
    )
    return null
  })

  if (!data) {
    return null
  }

  if (data.items.length === 0) {
    return null
  }

  return <HomeHeroCarousel banners={data.items} />
}
