import Link from 'next/link'
import type { RiskProfileDetail, RiskSignal } from '@/types/risk'
import { formatRiskScore, getRiskSignalLabel } from '@/types/risk'

function readString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key]
  return typeof value === 'string' && value ? value : null
}

function getSignalLink(signal: RiskSignal, profile: RiskProfileDetail) {
  const reportId = readString(signal.metadata, 'reportId')
  if (reportId) {
    return { href: `/admin/reports/${reportId}`, label: 'Відкрити скаргу' }
  }

  const disputeId = readString(signal.metadata, 'disputeId')
  if (disputeId) {
    return { href: `/admin/disputes/${disputeId}`, label: 'Відкрити спір' }
  }

  const productId = readString(signal.metadata, 'productId')
  if (productId) {
    return { href: `/products/${productId}`, label: 'Відкрити товар' }
  }

  if (profile.store) {
    return { href: '/admin/sellers', label: 'Відкрити продавців' }
  }

  if (profile.user) {
    return { href: `/admin/users?search=${encodeURIComponent(profile.user.email)}`, label: 'Відкрити користувача' }
  }

  return null
}

function getSignalContext(signal: RiskSignal, profile: RiskProfileDetail) {
  const orderId = readString(signal.metadata, 'orderId')
  const paymentId = readString(signal.metadata, 'paymentId')
  const productId = readString(signal.metadata, 'productId')
  const storeName = readString(signal.metadata, 'storeName') ?? profile.store?.name ?? null

  return [orderId ? `Замовлення ${orderId.slice(0, 8)}` : null, paymentId ? `Платіж ${paymentId.slice(0, 8)}` : null, productId ? `Товар ${productId.slice(0, 8)}` : null, storeName].filter(Boolean).join(' · ')
}

export default function RiskSignalTimeline({
  signals,
  profile,
}: {
  signals: RiskSignal[]
  profile: RiskProfileDetail
}) {
  if (signals.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-panelBorder bg-panelAlt px-5 py-6 text-sm text-copy-muted">
        Для цього профілю ще немає сигналів, що відповідають поточному фільтру.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {signals.map((signal) => {
        const link = getSignalLink(signal, profile)
        const context = getSignalContext(signal, profile)

        return (
          <article key={signal.id} className="rounded-3xl border border-panelBorder bg-panelAlt px-5 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-base font-semibold text-copy-strong">{getRiskSignalLabel(signal.signalType)}</p>
                <p className="text-sm text-copy-secondary">
                  Джерело: {signal.sourceType} · Вага: {formatRiskScore(signal.weight)}
                </p>
                {context ? <p className="text-sm text-copy-muted">{context}</p> : null}
              </div>
              <p className="text-sm text-copy-muted">{new Date(signal.createdAt).toLocaleString('uk-UA')}</p>
            </div>

            {link ? (
              <div className="mt-4">
                <Link href={link.href} className="ui-link-muted">
                  {link.label}
                </Link>
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
