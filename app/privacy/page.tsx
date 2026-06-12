import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Політика конфіденційності — Вайб',
  description:
    'Інформація про обробку персональних даних у маркетплейсі Вайб.',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.16em] text-copy-muted">
          Legal
        </p>
        <h1 className="text-3xl font-semibold text-copy-strong sm:text-4xl">
          Політика конфіденційності
        </h1>
        <p className="max-w-3xl text-sm text-copy-secondary sm:text-base">
          Тут ми коротко пояснюємо, які персональні дані використовуються під час
          оформлення замовлень, доставки та підтримки користувачів маркетплейсу.
        </p>
      </header>

      <section className="space-y-4 rounded-3xl border border-panelBorder bg-panel px-5 py-6 text-sm leading-6 text-copy-secondary sm:px-7">
        <p>
          Ми обробляємо лише ті дані, які потрібні для створення замовлення,
          доставки, оплати, комунікації з продавцем і виконання юридичних
          обов’язків сервісу.
        </p>
        <p>
          До таких даних можуть належати ім’я, номер телефону, адреса доставки,
          електронна пошта, історія замовлень та технічні журнали, необхідні для
          безпеки й підтримки.
        </p>
        <p>
          Дані не використовуються для несанкціонованих цілей, а доступ до них
          обмежується відповідно до ролей, службових задач і політик безпеки
          платформи.
        </p>
        <p>
          Якщо вам потрібна детальніша юридична редакція політики, її можна
          доповнити окремим затвердженим текстом без зміни checkout-логіки.
        </p>
      </section>
    </main>
  )
}
