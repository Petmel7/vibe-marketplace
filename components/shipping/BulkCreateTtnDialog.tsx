'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSellerMutation } from '@/hooks/useSellerMutation'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import type { BulkCreateShipmentTtnResponse, SellerShipment } from '@/types/shipping'
import BulkShipmentResultList from './BulkShipmentResultList'

export default function BulkCreateTtnDialog({
  shipments,
  selectedShipmentIds,
  onSelectionChange,
}: {
  shipments: SellerShipment[]
  selectedShipmentIds: string[]
  onSelectionChange: (ids: string[]) => void
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<BulkCreateShipmentTtnResponse['results']>([])
  const mutation = useSellerMutation()

  const selectedShipments = useMemo(
    () => shipments.filter((shipment) => selectedShipmentIds.includes(shipment.id)),
    [selectedShipmentIds, shipments],
  )

  return (
    <>
      <button
        type="button"
        className="ui-primary-button max-[499px]:w-full"
        disabled={selectedShipmentIds.length === 0}
        onClick={() => setIsOpen(true)}
      >
        Створити ТТН для вибраних ({selectedShipmentIds.length})
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Bulk TTN creation"
            className="w-full max-w-2xl rounded-3xl border border-panelBorder bg-panel p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-copy-strong">Bulk TTN creation</h2>
                <p className="text-sm text-copy-secondary">
                  Backend створює ТТН окремо для кожного shipment і повертає часткові помилки без зупинки всієї операції.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-copy-muted transition hover:bg-panelAlt hover:text-copy-strong"
                onClick={() => setIsOpen(false)}
                aria-label="Закрити bulk TTN dialog"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-panelBorder bg-panelAlt/40 p-4">
                <p className="text-sm font-medium text-copy-strong">Вибрано {selectedShipments.length} shipment(s)</p>
                <ul className="mt-3 space-y-2 text-sm text-copy-secondary">
                  {selectedShipments.map((shipment) => (
                    <li key={shipment.id}>
                      #{shipment.orderId.slice(0, 8)} · {shipment.recipientCityName}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="ui-primary-button"
                  disabled={mutation.isPending || selectedShipmentIds.length === 0}
                  onClick={() => {
                    void mutation.execute<BulkCreateShipmentTtnResponse>({
                      url: API_ROUTES.sellerShipmentsBulkCreateTtn,
                      body: { shipmentIds: selectedShipmentIds },
                      successMessage: 'Bulk TTN operation completed.',
                      errorMessage: 'Не вдалося створити ТТН для вибраних shipment.',
                      refresh: false,
                      onSuccess: async (data) => {
                        setResults(data.results)
                        onSelectionChange(
                          data.results
                            .filter((result) => !result.success)
                            .map((result) => result.shipmentId),
                        )
                      },
                    })
                  }}
                >
                  {mutation.isPending ? 'Створюємо ТТН...' : 'Запустити bulk створення'}
                </button>
                <button
                  type="button"
                  className="ui-secondary-button"
                  onClick={() => {
                    if (results.length > 0) {
                      router.refresh()
                    }
                    setResults([])
                    setIsOpen(false)
                  }}
                >
                  Закрити
                </button>
              </div>

              {mutation.errorMessage ? (
                <p className="text-sm text-brand-danger">{mutation.errorMessage}</p>
              ) : null}

              {results.length > 0 ? <BulkShipmentResultList results={results} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
