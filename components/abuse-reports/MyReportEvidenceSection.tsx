'use client'

import { useEffect, useState } from 'react'
import { abuseReportsApi } from './api/abuse-reports.api'
import type { AbuseReportEvidence } from '@/types/abuse-reports'
import EvidencePreviewList from './EvidencePreviewList'
import { buildEvidenceCountLabel } from './evidence.shared'

export default function MyReportEvidenceSection({ reportId }: { reportId: string }) {
  const [items, setItems] = useState<AbuseReportEvidence[] | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function loadEvidence() {
      try {
        const response = await abuseReportsApi.listMyEvidence(reportId)
        setItems(response.items)
        setErrorMessage(null)
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Не вдалося завантажити прикріплені докази.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadEvidence()
  }, [reportId])

  async function handleDelete(evidenceId: string) {
    if (!window.confirm('Видалити цей доказ зі скарги?')) {
      return
    }

    setIsDeleting(true)
    try {
      await abuseReportsApi.deleteEvidence(reportId, evidenceId)
      setItems((current) => current?.filter((item) => item.id !== evidenceId) ?? [])
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Не вдалося видалити доказ. Спробуйте ще раз.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const countLabel = buildEvidenceCountLabel(items, isLoading)

  return (
    <div className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-copy-muted">Докази</p>
          <p className="mt-1 text-sm text-copy-secondary">{countLabel}</p>
        </div>
        <button
          type="button"
          className="ui-secondary-button"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? 'Сховати файли' : 'Переглянути файли'}
        </button>
      </div>

      {isExpanded ? (
        <div className="mt-4 space-y-3">
          {errorMessage ? (
            <p className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
              {errorMessage}
            </p>
          ) : null}

          <EvidencePreviewList
            evidence={items}
            isLoading={isLoading || isDeleting}
            emptyMessage="До скарги ще не додано жодних доказів."
            onDeleteEvidence={(evidenceId) => void handleDelete(evidenceId)}
          />
        </div>
      ) : null}
    </div>
  )
}
