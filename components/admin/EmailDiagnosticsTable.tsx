'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import EmailRetryButton from '@/components/admin/EmailRetryButton'
import EmailStatusBadge from '@/components/admin/EmailStatusBadge'
import type { AdminEmailEventDetail } from '@/types/admin-emails'

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

  return 'The latest delivery attempt failed. Open the event to inspect its retry state.'
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
      title="Transactional email events"
      description="Inspect idempotent email events, latest provider delivery attempts, and retry eligibility."
      actions={(
        <label className="min-w-0 space-y-2 sm:w-72">
          <span className="block text-sm font-medium text-copy-strong">Recipient quick filter</span>
          <input
            type="search"
            value={recipientFilter}
            onChange={(event) => setRecipientFilter(event.target.value)}
            className="ui-surface-input"
            placeholder="Filter current results by email"
            aria-label="Filter current email events by recipient email"
          />
        </label>
      )}
    >
      {filteredItems.length === 0 ? (
        <div className="p-6">
          <AdminEmptyState
            title={items.length === 0 ? 'No email events yet' : 'No email events match this recipient'}
            description={
              items.length === 0
                ? 'Transactional email events will appear here after welcome, order, and moderation flows enqueue them.'
                : 'Try a different recipient filter or clear it to see the full result set for this page.'
            }
          />
        </div>
      ) : (
        <table className="min-w-full text-sm">
          <thead className="bg-panel/60 text-left text-copy-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Event</th>
              <th className="px-5 py-3 font-medium">Recipient</th>
              <th className="px-5 py-3 font-medium">Template</th>
              <th className="px-5 py-3 font-medium">Latest delivery</th>
              <th className="px-5 py-3 font-medium">Attempts</th>
              <th className="px-5 py-3 font-medium">Sent</th>
              <th className="px-5 py-3 font-medium">Failed</th>
              <th className="px-5 py-3 font-medium">Error</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const latestLog = item.logs[0] ?? null

              return (
                <tr key={item.id} className="border-t border-panelBorder align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-copy-strong">{item.eventType}</p>
                    <p className="mt-1 text-copy-muted">{formatDateTime(item.createdAt)}</p>
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    <p className="break-all">{item.recipientEmail}</p>
                    {item.recipientUserId ? (
                      <p className="mt-1 text-xs text-copy-muted">User ID: {item.recipientUserId}</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-copy-strong">{item.template}</p>
                    <div className="mt-2">
                      <EmailStatusBadge status={item.status} />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    {latestLog ? (
                      <div className="space-y-2">
                        <p>{latestLog.provider}</p>
                        <EmailStatusBadge status={latestLog.status} kind="delivery" />
                      </div>
                    ) : (
                      <span className="text-copy-muted">No provider log yet</span>
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
                        View event
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
