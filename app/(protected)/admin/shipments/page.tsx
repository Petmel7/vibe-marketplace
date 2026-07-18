import AdminSection from '@/components/admin/AdminSection'
import ShipmentSyncButton from '@/components/shipping/ShipmentSyncButton'
import { getCurrentUser } from '@/lib/session/getSession'

export default async function AdminShipmentsPage() {
  const user = await getCurrentUser()
  if (!user) return null

  return (
    <AdminSection
      eyebrow="Доставка"
      title="Інструменти відправлень"
      description="Ручна синхронізація статусів відправлень допомагає швидко підтягнути нові стани Nova Poshta без фонового обробника завдань. Автоматичні дії для сценарію повернень тут не запускаються."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="ui-elevated-panel p-5 sm:p-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-copy-strong">Синхронізація відстеження</h2>
            <p className="text-sm text-copy-secondary">
              Запускає синхронізацію на backend для відправлень Nova Poshta зі статусом очікування та для
              відстежуваних відправлень. Це корисно для затриманих, неуспішних або щойно відправлених посилок.
            </p>
          </div>

          <div className="mt-5 flex justify-center">
            <ShipmentSyncButton label="Синхронізувати відправлення в очікуванні" />
          </div>
        </section>

        <section className="ui-elevated-panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-copy-strong">Обсяг діагностики</h2>
          <div className="mt-4 space-y-3 text-sm text-copy-secondary">
            <p>Backend фази 3 уже надає основу для синхронізації відправлень і повернень.</p>
            <p>
              Адміністративна черга відправлень лише для читання ще не відкрита з backend, тому ця сторінка навмисно
              лишається сфокусованою на інструментах, а не імітує діагностику на клієнті.
            </p>
            <p>
              Використовуйте сторінки відправлень продавця та деталі замовлення покупця, щоб перевіряти знімки
              відправлень, стан ТТН і зв’язок із поверненням, доки не з’явиться окрема адміністративна модель читання.
            </p>
          </div>
        </section>
      </div>
    </AdminSection>
  )
}
