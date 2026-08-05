import Image from 'next/image'
import DashboardCard from '@/components/ui/dashboard/DashboardCard'
import type { HeroBannerFormValues, PreviewMode } from '../types'

export default function HeroBannerPreview({
  values,
  mode,
  onModeChange,
}: {
  values: HeroBannerFormValues
  mode: PreviewMode
  onModeChange: (mode: PreviewMode) => void
}) {
  const previewImage =
    mode === 'mobile'
      ? values.mobileImageUrl || values.tabletImageUrl || values.desktopImageUrl
      : mode === 'tablet'
        ? values.tabletImageUrl || values.desktopImageUrl
        : values.desktopImageUrl
  const previewWidth = mode === 'mobile' ? 'max-w-sm' : mode === 'tablet' ? 'max-w-2xl' : 'max-w-5xl'

  return (
    <DashboardCard
      title="Живе прев’ю"
      description="Адмін-прев’ю оновлюється одразу і не є публічним Hero-компонентом головної сторінки."
    >
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {(['desktop', 'tablet', 'mobile'] as const).map((previewMode) => (
          <button
            key={previewMode}
            type="button"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              mode === previewMode
                ? 'border-brand-accent bg-brand-accent text-white'
                : 'border-panelBorder bg-panel text-copy-secondary hover:text-copy-strong'
            }`}
            onClick={() => onModeChange(previewMode)}
          >
            {previewMode === 'desktop' ? 'Десктоп' : previewMode === 'tablet' ? 'Планшет' : 'Мобільний'}
          </button>
        ))}
      </div>
      <div
        className={`relative mx-auto min-h-72 overflow-hidden rounded-[2rem] border border-panelBorder ${previewWidth}`}
        style={{ backgroundColor: values.backgroundColor }}
      >
        {previewImage ? (
          <Image
            src={previewImage}
            alt={values.imageAlt || values.title || 'Hero preview'}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 960px"
            className="object-cover"
          />
        ) : null}
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: Math.min(1, Math.max(0, Number(values.overlayOpacity) || 0)) }}
        />
        <div className="relative z-10 flex min-h-72 flex-col justify-center p-6 sm:p-10" style={{ color: values.textColor }}>
          {values.eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-80">{values.eyebrow}</p>
          ) : null}
          <h3 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-5xl">
            {values.title || 'Назва Hero-банера'}
          </h3>
          {values.subtitle ? <p className="mt-3 max-w-xl text-lg font-medium">{values.subtitle}</p> : null}
          {values.description ? <p className="mt-3 max-w-xl text-sm opacity-85">{values.description}</p> : null}
          {values.destinationType !== 'NONE' && values.ctaText ? (
            <span className="mt-6 inline-flex w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">
              {values.ctaText}
            </span>
          ) : null}
        </div>
      </div>
    </DashboardCard>
  )
}
