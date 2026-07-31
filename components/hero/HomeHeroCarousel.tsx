'use client'

import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getHeroBannerCtaHref } from '@/components/hero/heroBanner.links'
import type { HeroBanner } from '@/types/hero-banners'

const DEFAULT_AUTOPLAY_DELAY = 5000

function getSlideDelay(banner: HeroBanner) {
  return banner.autoplay ? banner.autoplayDelay ?? DEFAULT_AUTOPLAY_DELAY : DEFAULT_AUTOPLAY_DELAY
}

function getOverlayOpacity(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 0.35
  }

  return Math.min(1, Math.max(0, parsed))
}

function HeroImage({
  banner,
  priority,
}: {
  banner: HeroBanner
  priority: boolean
}) {
  const desktopImage = banner.desktopImageUrl
  const tabletImage = banner.tabletImageUrl || desktopImage
  const mobileImage = banner.mobileImageUrl || tabletImage || desktopImage
  const imageLoadingProps = priority
    ? { priority: true as const }
    : { loading: 'lazy' as const }

  if (!desktopImage) {
    return null
  }

  return (
    <>
      <Image
        src={desktopImage}
        alt={banner.imageAlt || banner.title}
        fill
        {...imageLoadingProps}
        sizes="100vw"
        className="hidden object-cover lg:block"
      />
      {tabletImage ? (
        <Image
          src={tabletImage}
          alt={banner.imageAlt || banner.title}
          fill
          {...imageLoadingProps}
          sizes="100vw"
          className="hidden object-cover sm:block lg:hidden"
        />
      ) : null}
      {mobileImage ? (
        <Image
          src={mobileImage}
          alt={banner.imageAlt || banner.title}
          fill
          {...imageLoadingProps}
          sizes="100vw"
          className="object-cover sm:hidden"
        />
      ) : null}
    </>
  )
}

export default function HomeHeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const autoplayPlugin = useRef(
    Autoplay({
      delay: () => banners.map(getSlideDelay),
      jump: false,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  )
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: 'start',
      loop: banners.length > 1,
      skipSnaps: false,
    },
    banners.length > 1 ? [autoplayPlugin.current] : [],
  )
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const syncCarouselState = useCallback(() => {
    if (!emblaApi) {
      return
    }

    const nextIndex = emblaApi.selectedScrollSnap()
    setSelectedIndex(nextIndex)

    const autoplay = autoplayPlugin.current
    if (banners[nextIndex]?.autoplay === false) {
      autoplay.stop()
    } else if (banners.length > 1) {
      autoplay.play()
    }
  }, [banners, emblaApi])

  useEffect(() => {
    if (!emblaApi) {
      return
    }

    setScrollSnaps(emblaApi.scrollSnapList())
    syncCarouselState()
    emblaApi.on('select', syncCarouselState)
    emblaApi.on('reInit', syncCarouselState)

    return () => {
      emblaApi.off('select', syncCarouselState)
      emblaApi.off('reInit', syncCarouselState)
    }
  }, [emblaApi, syncCarouselState])

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext()
  }, [emblaApi])

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index)
    },
    [emblaApi],
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      scrollPrev()
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      scrollNext()
    }
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Головні пропозиції маркетплейсу"
      className="relative overflow-hidden rounded-2xl border border-panelBorder bg-panel shadow-2xl shadow-black/10"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {banners.map((banner, index) => {
            const ctaHref = getHeroBannerCtaHref(banner)
            const textColor = banner.textColor ?? '#ffffff'

            return (
              <article
                key={banner.id}
                aria-roledescription="slide"
                aria-label={`${index + 1} із ${banners.length}: ${banner.title}`}
                className="relative min-w-0 flex-[0_0_100%]"
                style={{ backgroundColor: banner.backgroundColor ?? '#111827' }}
              >
                <div className="relative min-h-55 overflow-hidden sm:min-h-75 lg:min-h-90">
                  <HeroImage banner={banner} priority={index === 0} />
                  <div
                    className="absolute inset-0 bg-black"
                    style={{ opacity: getOverlayOpacity(banner.overlayOpacity) }}
                    aria-hidden="true"
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_32%),linear-gradient(90deg,rgba(0,0,0,0.48),rgba(0,0,0,0.04))]" aria-hidden="true" />

                  <div className="relative z-10 flex min-h-55 items-center px-5 py-10 sm:min-h-75 sm:px-10 lg:min-h-90 lg:px-16">
                    <div className="max-w-2xl" style={{ color: textColor }}>
                      {banner.eyebrow ? (
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-80 sm:text-sm">
                          {banner.eyebrow}
                        </p>
                      ) : null}
                      <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                        {banner.title}
                      </h1>
                      {banner.subtitle ? (
                        <p className="mt-4 max-w-xl text-lg font-medium leading-7 opacity-95 sm:text-2xl">
                          {banner.subtitle}
                        </p>
                      ) : null}
                      {banner.description ? (
                        <p className="mt-4 max-w-xl text-sm leading-6 opacity-85 sm:text-base">
                          {banner.description}
                        </p>
                      ) : null}
                      {ctaHref && banner.ctaText ? (
                        <Link
                          href={ctaHref}
                          target={banner.openInNewTab ? '_blank' : undefined}
                          rel={banner.openInNewTab ? 'noopener noreferrer' : undefined}
                          className="mt-7 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          {banner.ctaText}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {banners.length > 1 ? (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 sm:px-4 lg:px-6">
            <button
              type="button"
              aria-label="Попередній банер"
              className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent sm:h-11 sm:w-11"
              onClick={scrollPrev}
            >
              <ChevronLeft size={20} strokeWidth={2.25} />
            </button>
            <button
              type="button"
              aria-label="Наступний банер"
              className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent sm:h-11 sm:w-11"
              onClick={scrollNext}
            >
              <ChevronRight size={20} strokeWidth={2.25} />
            </button>
          </div>

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-2 backdrop-blur">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Перейти до банера ${index + 1}`}
                aria-current={index === selectedIndex ? 'true' : undefined}
                className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${index === selectedIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/70'
                  }`}
                onClick={() => scrollTo(index)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}
