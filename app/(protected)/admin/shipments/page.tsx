import AdminSection from '@/components/admin/AdminSection'
import ShipmentSyncButton from '@/components/shipping/ShipmentSyncButton'
import { getCurrentUser } from '@/lib/session/getSession'

export default async function AdminShipmentsPage() {
  const user = await getCurrentUser()
  if (!user) return null

  return (
    <AdminSection
      eyebrow="Shipping"
      title="Shipment tools"
      description="Ручний sync shipment statuses допомагає швидко підтягнути нові Nova Poshta стани без фонового job runner. Автоматичні дії над refund flow тут не запускаються."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="ui-elevated-panel p-5 sm:p-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-copy-strong">Tracking sync</h2>
            <p className="text-sm text-copy-secondary">
              Запускає backend sync для pending і trackable Nova Poshta shipment. Це корисно для delayed, failed або щойно відправлених посилок.
            </p>
          </div>

          <div className="mt-5">
            <ShipmentSyncButton label="Синхронізувати pending shipments" />
          </div>
        </section>

        <section className="ui-elevated-panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-copy-strong">Diagnostics scope</h2>
          <div className="mt-4 space-y-3 text-sm text-copy-secondary">
            <p>Phase 3 backend already exposes shipment sync and return foundations.</p>
            <p>Read-only admin shipment queue is not exposed by the backend yet, so this page intentionally stays tool-focused instead of faking diagnostics client-side.</p>
            <p>Use seller shipment pages and buyer order details to inspect per-shipment snapshots, TTN state, and return linkage until the dedicated admin read-model lands.</p>
          </div>
        </section>
      </div>
    </AdminSection>
  )
}
