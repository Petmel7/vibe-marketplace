'use client'

import Link from 'next/link'

export default function NotificationEmptyState({
  actionHref = '/catalog',
  actionLabel = 'Перейти до каталогу',
  compact = false,
  description = 'Коли на платформі з’являться важливі оновлення щодо замовлень, оплат або модерації, вони з’являться тут.',
  title = 'Поки що немає сповіщень',
}: {
  actionHref?: string
  actionLabel?: string
  compact?: boolean
  description?: string
  title?: string
}) {
  return (
    <div
      className={`rounded-3xl border border-dashed border-panelBorder bg-panel/60 text-center ${
        compact ? 'px-4 py-8' : 'px-6 py-12'
      }`}
    >
      <h3 className="text-base font-semibold text-copy-strong">{title}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-copy-muted">{description}</p>
      <Link href={actionHref} className="ui-secondary-button mt-5">
        {actionLabel}
      </Link>
    </div>
  )
}

