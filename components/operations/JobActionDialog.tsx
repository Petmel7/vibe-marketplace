'use client'

import { useId, useState } from 'react'
import { useAdminOperations } from '@/hooks/useAdminOperations'

export default function JobActionDialog({
  jobId,
  action,
}: {
  jobId: string
  action: 'retry' | 'cancel'
}) {
  const titleId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const { retryJob, cancelJob, isPending, errorMessage, setErrorMessage } = useAdminOperations()

  const title = action === 'retry' ? 'Retry failed job' : 'Cancel pending job'
  const body =
    action === 'retry'
      ? 'This will enqueue one more attempt for the failed job. Existing idempotency protections stay in place.'
      : 'This will cancel the pending job before it is picked up by the runner.'

  return (
    <>
      <button
        type="button"
        className="ui-secondary-button"
        onClick={() => {
          setErrorMessage(null)
          setIsOpen(true)
        }}
      >
        {action === 'retry' ? 'Retry' : 'Cancel'}
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-title`}
            className="w-full max-w-lg rounded-[28px] border border-panelBorder bg-background p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h2 id={`${titleId}-title`} className="text-xl font-semibold text-copy-strong">
                {title}
              </h2>
              <p className="text-sm text-copy-muted">{body}</p>
            </div>

            {errorMessage ? (
              <p className="mt-5 rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="ui-secondary-button" disabled={isPending} onClick={() => setIsOpen(false)}>
                Close
              </button>
              <button
                type="button"
                className="ui-primary-button disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={async () => {
                  const result =
                    action === 'retry'
                      ? await retryJob(jobId)
                      : await cancelJob(jobId)

                  if (result) {
                    setIsOpen(false)
                  }
                }}
              >
                {isPending ? 'Working…' : action === 'retry' ? 'Confirm retry' : 'Confirm cancel'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

