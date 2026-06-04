import { formatPrice } from '@/utils/formatters/price'

export default function DeliveryEstimateCard({
  estimatedCost,
  currency,
  isReady,
}: {
  estimatedCost: string | null
  currency?: string | null
  isReady: boolean
}) {
  return (
    <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-copy-strong">Орієнтовна вартість доставки</h3>
          <p className="text-sm text-copy-muted">
            Суму розраховує backend на основі поточних даних Nova Poshta і вона повторно перевіряється під час оформлення.
          </p>
        </div>
        <p className="text-right text-base font-semibold text-copy-strong">
          {estimatedCost ? formatPrice(estimatedCost) : '—'}
        </p>
      </div>
      {!estimatedCost ? (
        <p className="mt-3 text-sm text-copy-secondary">
          {isReady
            ? `Не вдалося отримати оцінку вартості прямо зараз${currency ? ` (${currency})` : ''}.`
            : 'Оберіть тип доставки, місто та повні дані отримувача, щоб побачити оцінку.'}
        </p>
      ) : null}
    </div>
  )
}
