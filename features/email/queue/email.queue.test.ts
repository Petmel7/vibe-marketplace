import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/email/email.service', () => ({
  enqueueEmail: vi.fn(),
  processEmailEvent: vi.fn(),
}))

vi.mock('@/features/jobs/jobs.queue', () => ({
  enqueueEmailJob: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
}))

import { enqueueEmail } from '@/features/email/email.service'
import { enqueueEmailJob } from '@/features/jobs/jobs.queue'
import { logError } from '@/utils/logger'
import { enqueueEmailEvent } from './email.queue'

const mockEnqueueEmail = vi.mocked(enqueueEmail)
const mockEnqueueEmailJob = vi.mocked(enqueueEmailJob)
const mockLogError = vi.mocked(logError)

describe('email.queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnqueueEmail.mockResolvedValue({
      id: 'email-event-1',
      eventType: 'ORDER_CREATED',
      dedupeKey: 'email:1',
      recipientEmail: 'buyer@example.com',
      recipientUserId: 'user-1',
      template: 'ORDER_CREATED_EMAIL',
      payload: {},
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 3,
      nextAttemptAt: null,
      processedAt: null,
      failedAt: null,
      createdAt: '2026-06-08T10:00:00.000Z',
      updatedAt: '2026-06-08T10:00:00.000Z',
    } as never)
    mockEnqueueEmailJob.mockResolvedValue(null)
  })

  it('enqueues an email delivery job after persisting the email event', async () => {
    const event = await enqueueEmailEvent({
      eventType: 'ORDER_CREATED',
      dedupeKey: 'email:1',
      recipientEmail: 'buyer@example.com',
      recipientUserId: 'user-1',
      template: 'ORDER_CREATED_EMAIL',
      payload: {},
    } as never)

    expect(event.id).toBe('email-event-1')
    expect(mockEnqueueEmailJob).toHaveBeenCalledWith('email-event-1')
  })

  it('does not fail the caller if background job scheduling errors', async () => {
    mockEnqueueEmailJob.mockRejectedValueOnce(new Error('queue down'))

    const event = await enqueueEmailEvent({
      eventType: 'ORDER_CREATED',
      dedupeKey: 'email:1',
      recipientEmail: 'buyer@example.com',
      recipientUserId: 'user-1',
      template: 'ORDER_CREATED_EMAIL',
      payload: {},
    } as never)

    await vi.waitFor(() => {
      expect(mockLogError).toHaveBeenCalledWith(
        'email:enqueue-delivery-job',
        expect.any(Error),
        expect.objectContaining({
          domain: 'email',
          emailEventId: 'email-event-1',
        }),
      )
    })
    expect(event.id).toBe('email-event-1')
  })
})
