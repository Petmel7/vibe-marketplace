import Link from 'next/link'
import VerificationStatusBadge from '@/components/seller/VerificationStatusBadge'
import type { SellerVerificationStatus } from '@/types/seller'

export default function SellerStatePanel({
  title,
  description,
  status,
  reason,
  actionHref,
  actionLabel,
}: {
  title: string
  description: string
  status?: SellerVerificationStatus | null
  reason?: string | null
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <section className="ui-elevated-panel p-6 sm:p-7">
      <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-copy-muted">Статус продавця</p>
          <h2 className="text-2xl font-semibold text-copy-strong">{title}</h2>
          <p className="max-w-3xl text-sm text-copy-secondary">{description}</p>
          {reason ? (
            <div className="rounded-2xl border border-brand-danger/20 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
              {reason}
            </div>
          ) : null}
          {actionHref && actionLabel ? (
            <Link href={actionHref} className="ui-secondary-button mt-2">
              {actionLabel}
            </Link>
          ) : null}
        </div>
        {status ? (
          <div className="order-first shrink-0 self-start lg:order-0">
            <VerificationStatusBadge status={status} />
          </div>
        ) : null}
      </div>
    </section>
  )
}
