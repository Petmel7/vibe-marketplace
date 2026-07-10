'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import EmailRetryButton from '@/components/admin/EmailRetryButton'
import EmailStatusBadge from '@/components/admin/EmailStatusBadge'
import { formatEmailEventLabel, type AdminEmailEventDetail } from '@/types/admin-emails'

function formatDateTime(value: string | null) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('uk-UA')
}

function truncateError(value: string | null) {
  if (!value) {
    return '—'
  }

  return 'Остання спроба доставки завершилася невдачею. Відкрийте подію, щоб перевірити стан повторних спроб.'
}

function formatProviderLabel(provider: string) {
  return provider === 'RESEND' ? 'Повторне надсилання' : provider
}

export default function EmailDiagnosticsTable({
  items,
}: {
  items: AdminEmailEventDetail[]
}) {
  const [recipientFilter, setRecipientFilter] = useState('')

  const filteredItems = useMemo(() => {
    const normalized = recipientFilter.trim().toLowerCase()
    if (!normalized) {
      return items
    }

    return items.filter((item) => item.recipientEmail.toLowerCase().includes(normalized))
  }, [items, recipientFilter])

  return (
    <AdminDataTable
      title="Події транзакційних листів"
      description="Перевіряйте ідемпотентні email-події, останні спроби доставки від провайдера та можливість повторного запуску."
      actions={
        <label className="min-w-0 space-y-2 sm:w-72">
          <span className="block text-sm font-medium text-copy-strong">Швидкий фільтр за отримувачем</span>
          <input
            type="search"
            value={recipientFilter}
            onChange={(event) => setRecipientFilter(event.target.value)}
            className="ui-surface-input"
            placeholder="Фільтр поточних результатів за email"
            aria-label="Фільтр поточних email-подій за email отримувача"
          />
        </label>
      }
    >
      {filteredItems.length === 0 ? (
        <div className="p-6">
          <AdminEmptyState
            title={items.length === 0 ? 'Email-подій ще немає' : 'Жодна email-подія не відповідає цьому отримувачу'}
            description={
              items.length === 0
                ? 'Транзакційні email-події з’являться тут після постановки в чергу сценаріїв вітання, замовлень і модерації.'
                : 'Спробуйте інший фільтр за отримувачем або очистіть його, щоб побачити весь набір результатів на цій сторінці.'
            }
          />
        </div>
      ) : (
        <table className="min-w-full text-sm">
          <thead className="bg-panel/60 text-left text-copy-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Подія</th>
              <th className="px-5 py-3 font-medium">Отримувач</th>
              <th className="px-5 py-3 font-medium">Шаблон</th>
              <th className="px-5 py-3 font-medium">Остання доставка</th>
              <th className="px-5 py-3 font-medium">Спроби</th>
              <th className="px-5 py-3 font-medium">Надіслано</th>
              <th className="px-5 py-3 font-medium">Невдало</th>
              <th className="px-5 py-3 font-medium">Помилка</th>
              <th className="px-5 py-3 font-medium">Дії</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const latestLog = item.logs[0] ?? null

              return (
                <tr key={item.id} className="border-t border-panelBorder align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-copy-strong">{formatEmailEventLabel(item.eventType)}</p>
                    <p className="mt-1 text-copy-muted">{formatDateTime(item.createdAt)}</p>
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    <p className="break-all">{item.recipientEmail}</p>
                    {item.recipientUserId ? (
                      <p className="mt-1 text-xs text-copy-muted">ID користувача: {item.recipientUserId}</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-copy-strong">{formatEmailEventLabel(item.template)}</p>
                    <div className="mt-2">
                      <EmailStatusBadge status={item.status} />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    {latestLog ? (
                      <div className="space-y-2">
                        <p>{formatProviderLabel(latestLog.provider)}</p>
                        <EmailStatusBadge status={latestLog.status} kind="delivery" />
                      </div>
                    ) : (
                      <span className="text-copy-muted">Ще немає логу провайдера</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    {item.attempts} / {item.maxAttempts}
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    {formatDateTime(latestLog?.sentAt ?? item.processedAt)}
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    {formatDateTime(item.failedAt)}
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    {truncateError(latestLog?.errorMessage ?? null)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-2">
                      <Link href={`/admin/emails/${item.id}`} className="ui-secondary-button text-center">
                        Переглянути подію
                      </Link>
                      <EmailRetryButton
                        eventId={item.id}
                        status={item.status}
                        attempts={item.attempts}
                        maxAttempts={item.maxAttempts}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </AdminDataTable>
  )
}
