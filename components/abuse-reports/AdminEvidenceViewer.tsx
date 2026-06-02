'use client'

import { useEffect, useState } from 'react'
import { abuseReportsApi } from './api/abuse-reports.api'
import type { AbuseReportEvidence } from '@/types/abuse-reports'
import EvidencePreviewList from './EvidencePreviewList'

export default function AdminEvidenceViewer({ reportId }: { reportId: string }) {
  const [items, setItems] = useState<AbuseReportEvidence[] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadEvidence() {
      try {
        const response = await abuseReportsApi.listAdminEvidence(reportId)
        setItems(response.items)
        setErrorMessage(null)
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Не вдалося завантажити докази для скарги.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadEvidence()
  }, [reportId])

  if (errorMessage) {
    return (
      <div className="rounded-3xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-4 text-sm text-copy-primary">
        {errorMessage}
      </div>
    )
  }

  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-copy-strong">Докази</h2>
          <p className="mt-1 text-sm text-copy-muted">
            Перегляньте прикріплені файли, які користувач додав до цієї скарги.
          </p>
        </div>

        <EvidencePreviewList
          evidence={items}
          isLoading={isLoading}
          emptyMessage="До цієї скарги ще не додано жодних доказів."
        />
      </div>
    </section>
  )
}
