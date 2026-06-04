import type { BulkCreateShipmentTtnResult } from '@/types/shipping'

export default function BulkShipmentResultList({
  results,
}: {
  results: BulkCreateShipmentTtnResult[]
}) {
  return (
    <ul className="space-y-3">
      {results.map((result) => (
        <li
          key={result.shipmentId}
          className={`rounded-2xl border px-4 py-3 text-sm ${
            result.success
              ? 'border-brand-success/30 bg-brand-success/10'
              : 'border-brand-danger/30 bg-brand-danger/10'
          }`}
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium text-copy-strong">Shipment #{result.shipmentId.slice(0, 8)}</p>
              <p className="mt-1 text-copy-secondary">
                {result.success
                  ? `ТТН створено${result.trackingNumber ? `: ${result.trackingNumber}` : '.'}`
                  : result.errorMessage ?? 'Не вдалося створити ТТН.'}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                result.success
                  ? 'bg-brand-success/15 text-brand-success'
                  : 'bg-brand-danger/15 text-brand-danger'
              }`}
            >
              {result.success ? 'Успіх' : 'Помилка'}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
