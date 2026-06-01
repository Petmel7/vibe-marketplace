import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/email/email.repository', () => ({
  countEmailEvents: vi.fn(),
  createEmailEvent: vi.fn(),
  createEmailLog: vi.fn(),
  findEmailEventByDedupeKey: vi.fn(),
  findEmailEventById: vi.fn(),
  listEmailEvents: vi.fn(),
  markEmailEventFailed: vi.fn(),
  markEmailEventSent: vi.fn(),
  claimEmailEventForProcessing: vi.fn(),
}))
vi.mock('@/features/email/services/email-template.service', () => ({
  renderEmailTemplate: vi.fn(),
}))
vi.mock('@/features/email/services/email-dispatch.service', () => ({
  createConfiguredEmailProvider: vi.fn(),
  sendEmailNowWithProvider: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
}))

import * as repo from '@/features/email/email.repository'
import * as templateService from '@/features/email/services/email-template.service'
import * as dispatchService from '@/features/email/services/email-dispatch.service'
import * as authGuards from '@/lib/auth/guards'
import {
  enqueueEmail,
  getAdminEmails,
  processEmailEvent,
  retryEmailEvent,
} from '@/features/email/email.service'
import { EmailRetryLimitExceededError } from '@/lib/errors/email'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockRepo = vi.mocked(repo)
const mockTemplateService = vi.mocked(templateService)
const mockDispatchService = vi.mocked(dispatchService)
const mockAuthGuards = vi.mocked(authGuards)

const mockAdmin: SessionUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  roles: ['ADMIN'],
}

const mockProvider = {
  name: 'RESEND' as const,
  send: vi.fn(),
}

function makeOrderCreatedPayload() {
  return {
    buyerEmail: 'buyer@example.com',
    buyerName: 'Olena Buyer',
    itemCount: 2,
    orderDetailsUrl: 'https://app.example.com/profile/orders/11111111-1111-1111-1111-111111111111',
    orderId: '11111111-1111-1111-1111-111111111111',
    orderItems: [
      {
        productName: 'Blue Hoodie',
        quantity: 1,
        storeName: 'North Store',
        unitPrice: '60.00',
        variantLabel: 'L / Blue',
      },
      {
        productName: 'Red Tee',
        quantity: 1,
        storeName: 'South Store',
        unitPrice: '60.00',
        variantLabel: null,
      },
    ],
    orderStatus: 'confirmed',
    paymentMethod: 'CASH_ON_DELIVERY',
    paymentStatus: 'PENDING',
    storeNames: ['North Store', 'South Store'],
    totalAmount: '120.00',
  }
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    eventType: 'ORDER_CREATED',
    dedupeKey: 'order-created:order-1',
    recipientEmail: 'buyer@example.com',
    recipientUserId: '22222222-2222-4222-8222-222222222222',
    template: 'ORDER_CREATED_EMAIL',
    payload: makeOrderCreatedPayload(),
    status: 'PENDING',
    attempts: 0,
    maxAttempts: 3,
    nextAttemptAt: null,
    processedAt: null,
    failedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    logs: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockDispatchService.createConfiguredEmailProvider.mockReturnValue(mockProvider)
  mockAuthGuards.requireAdmin.mockReturnValue(undefined)
})

describe('enqueueEmail', () => {
  it('returns the existing event when dedupeKey already exists', async () => {
    mockRepo.findEmailEventByDedupeKey.mockResolvedValue(makeEvent() as never)

    const result = await enqueueEmail({
      eventType: 'ORDER_CREATED',
      dedupeKey: 'order-created:order-1',
      recipientEmail: 'buyer@example.com',
      recipientUserId: '22222222-2222-4222-8222-222222222222',
      template: 'ORDER_CREATED_EMAIL',
      payload: makeOrderCreatedPayload(),
    })

    expect(mockRepo.createEmailEvent).not.toHaveBeenCalled()
    expect(result.id).toBe('event-1')
  })

  it('creates a new event when dedupeKey is new', async () => {
    mockRepo.findEmailEventByDedupeKey.mockResolvedValue(null)
    mockRepo.createEmailEvent.mockResolvedValue(makeEvent() as never)

    const result = await enqueueEmail({
      eventType: 'ORDER_CREATED',
      dedupeKey: 'order-created:order-1',
      recipientEmail: 'buyer@example.com',
      recipientUserId: '22222222-2222-4222-8222-222222222222',
      template: 'ORDER_CREATED_EMAIL',
      payload: makeOrderCreatedPayload(),
    })

    expect(mockRepo.createEmailEvent).toHaveBeenCalledOnce()
    expect(result.template).toBe('ORDER_CREATED_EMAIL')
  })
})

describe('processEmailEvent', () => {
  it('processes a pending event, logs provider success, and marks the event sent', async () => {
    mockRepo.findEmailEventById
      .mockResolvedValueOnce(makeEvent() as never)
    mockRepo.claimEmailEventForProcessing.mockResolvedValue(true)
    mockTemplateService.renderEmailTemplate.mockResolvedValue({
      template: 'ORDER_CREATED_EMAIL',
      subject: 'Order created',
      html: '<p>hello</p>',
      text: 'hello',
    })
    mockDispatchService.sendEmailNowWithProvider.mockResolvedValue({
      provider: 'RESEND',
      providerMessageId: 'msg-123',
      status: 'SENT',
    })
    mockRepo.markEmailEventSent.mockResolvedValue(
      makeEvent({
        status: 'SENT',
        attempts: 1,
        processedAt: new Date('2026-01-01T00:05:00.000Z'),
      }) as never,
    )

    const result = await processEmailEvent('event-1', { provider: mockProvider })

    expect(mockTemplateService.renderEmailTemplate).toHaveBeenCalled()
    expect(mockDispatchService.sendEmailNowWithProvider).toHaveBeenCalledWith(mockProvider, {
      recipientEmail: 'buyer@example.com',
      subject: 'Order created',
      html: '<p>hello</p>',
      text: 'hello',
    })
    expect(mockRepo.createEmailLog).toHaveBeenCalledWith(
      expect.objectContaining({
        emailEventId: 'event-1',
        provider: 'RESEND',
        providerMessageId: 'msg-123',
        status: 'SENT',
      }),
    )
    expect(result.status).toBe('SENT')
  })

  it('logs provider failure and schedules retry when delivery fails', async () => {
    mockRepo.findEmailEventById.mockResolvedValueOnce(makeEvent() as never)
    mockRepo.claimEmailEventForProcessing.mockResolvedValue(true)
    mockTemplateService.renderEmailTemplate.mockResolvedValue({
      template: 'ORDER_CREATED_EMAIL',
      subject: 'Order created',
      html: '<p>hello</p>',
      text: 'hello',
    })
    mockDispatchService.sendEmailNowWithProvider.mockRejectedValue(new Error('provider down'))
    mockRepo.markEmailEventFailed.mockResolvedValue(
      makeEvent({
        status: 'FAILED',
        attempts: 1,
        nextAttemptAt: new Date('2026-01-01T00:10:00.000Z'),
      }) as never,
    )

    const result = await processEmailEvent('event-1', { provider: mockProvider })

    expect(mockRepo.createEmailLog).toHaveBeenCalledWith(
      expect.objectContaining({
        emailEventId: 'event-1',
        provider: 'RESEND',
        status: 'FAILED',
      }),
    )
    expect(result.status).toBe('FAILED')
    expect(result.nextAttemptAt).not.toBeNull()
  })

  it('throws when retry limit has already been exceeded', async () => {
    mockRepo.findEmailEventById.mockResolvedValueOnce(
      makeEvent({
        attempts: 3,
        maxAttempts: 3,
        status: 'FAILED',
      }) as never,
    )

    await expect(processEmailEvent('event-1', { provider: mockProvider })).rejects.toThrow(
      EmailRetryLimitExceededError,
    )
  })
})

describe('admin diagnostics', () => {
  it('returns paginated email events for admins', async () => {
    mockRepo.listEmailEvents.mockResolvedValue([makeEvent()] as never)
    mockRepo.countEmailEvents.mockResolvedValue(1)

    const result = await getAdminEmails(mockAdmin, {
      page: 1,
      limit: 20,
    })

    expect(result.total).toBe(1)
    expect(result.items[0]?.id).toBe('event-1')
  })

  it('forces immediate retry for admins', async () => {
    mockRepo.findEmailEventById.mockResolvedValueOnce(makeEvent() as never)
    mockRepo.claimEmailEventForProcessing.mockResolvedValue(true)
    mockTemplateService.renderEmailTemplate.mockResolvedValue({
      template: 'ORDER_CREATED_EMAIL',
      subject: 'Order created',
      html: '<p>hello</p>',
      text: 'hello',
    })
    mockDispatchService.sendEmailNowWithProvider.mockResolvedValue({
      provider: 'RESEND',
      providerMessageId: 'msg-123',
      status: 'SENT',
    })
    mockRepo.markEmailEventSent.mockResolvedValue(
      makeEvent({
        status: 'SENT',
        attempts: 1,
        processedAt: new Date('2026-01-01T00:05:00.000Z'),
      }) as never,
    )

    const result = await retryEmailEvent(mockAdmin, 'event-1', mockProvider)

    expect(mockRepo.claimEmailEventForProcessing).toHaveBeenCalledWith(
      'event-1',
      expect.any(Date),
      { ignoreSchedule: true },
    )
    expect(result.status).toBe('SENT')
  })
})
