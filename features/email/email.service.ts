import { Prisma, type EmailEvent, type EmailLog } from '@/app/generated/prisma/client'
import { EmailEventNotFoundError, EmailRetryLimitExceededError } from '@/lib/errors/email'
import {
  countEmailEvents,
  createEmailEvent,
  createEmailLog,
  findEmailEventByDedupeKey,
  findEmailEventById,
  listEmailEvents,
  markEmailEventFailed,
  markEmailEventSent,
  claimEmailEventForProcessing,
} from './email.repository'
import type {
  AdminEmailQueryDto,
  EmailEventDetailDto,
  EmailEventDto,
  EmailEventListDto,
  EmailLogDto,
  EnqueueEmailEventDto,
  SendEmailNowInput,
  SendEmailNowResult,
} from './email.dto'
import { enqueueEmailEventSchema } from './email.schema'
import { renderEmailTemplate } from './services/email-template.service'
import {
  createConfiguredEmailProvider,
  sendEmailNowWithProvider,
} from './services/email-dispatch.service'
import type { EmailProvider } from './providers/email-provider'
import type { SessionUser } from '@/features/auth/auth.dto'
import { requireAdmin } from '@/lib/auth/guards'

function ensureAdmin(user: SessionUser) {
  requireAdmin(user)
}

function toEmailLogDto(log: EmailLog): EmailLogDto {
  return {
    id: log.id,
    emailEventId: log.emailEventId,
    provider: log.provider,
    providerMessageId: log.providerMessageId,
    recipientEmail: log.recipientEmail,
    recipientUserId: log.recipientUserId,
    template: log.template,
    subject: log.subject,
    status: log.status,
    errorMessage: log.errorMessage,
    sentAt: log.sentAt?.toISOString() ?? null,
    deliveredAt: log.deliveredAt?.toISOString() ?? null,
    bouncedAt: log.bouncedAt?.toISOString() ?? null,
    openedAt: log.openedAt?.toISOString() ?? null,
    clickedAt: log.clickedAt?.toISOString() ?? null,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt.toISOString(),
  }
}

function toEmailEventDto(event: EmailEvent): EmailEventDto {
  return {
    id: event.id,
    eventType: event.eventType,
    dedupeKey: event.dedupeKey,
    recipientEmail: event.recipientEmail,
    recipientUserId: event.recipientUserId,
    template: event.template,
    payload: event.payload,
    status: event.status,
    attempts: event.attempts,
    maxAttempts: event.maxAttempts,
    nextAttemptAt: event.nextAttemptAt?.toISOString() ?? null,
    processedAt: event.processedAt?.toISOString() ?? null,
    failedAt: event.failedAt?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }
}

function toEmailEventDetailDto(event: EmailEvent & { logs: EmailLog[] }): EmailEventDetailDto {
  return {
    ...toEmailEventDto(event),
    logs: event.logs.map(toEmailLogDto),
  }
}

function calculateNextAttemptAt(attempts: number): Date {
  const delayMinutes = Math.min(60, 5 * 2 ** Math.max(attempts - 1, 0))
  return new Date(Date.now() + delayMinutes * 60 * 1000)
}

export async function enqueueEmail<T extends EnqueueEmailEventDto>(
  input: T,
): Promise<EmailEventDto> {
  const parsed = enqueueEmailEventSchema.parse(input)
  const existing = await findEmailEventByDedupeKey(parsed.dedupeKey)

  if (existing) {
    return toEmailEventDto(existing)
  }

  const created = await createEmailEvent({
      dedupeKey: parsed.dedupeKey,
      eventType: parsed.eventType,
      maxAttempts: parsed.maxAttempts ?? 3,
      payload: parsed.payload as Prisma.InputJsonValue,
      recipientEmail: parsed.recipientEmail,
    recipientUserId: parsed.recipientUserId ?? null,
    template: parsed.template,
  })

  return toEmailEventDto(created)
}

export async function sendEmailNow(
  input: SendEmailNowInput,
  provider: EmailProvider = createConfiguredEmailProvider(),
): Promise<SendEmailNowResult> {
  return sendEmailNowWithProvider(provider, input)
}

export async function processEmailEvent(
  eventId: string,
  options?: { force?: boolean; provider?: EmailProvider },
): Promise<EmailEventDetailDto> {
  const event = await findEmailEventById(eventId)
  if (!event) {
    throw new EmailEventNotFoundError()
  }

  if (event.status === 'SENT' || event.status === 'CANCELLED') {
    return toEmailEventDetailDto(event)
  }

  if (event.attempts >= event.maxAttempts) {
    throw new EmailRetryLimitExceededError()
  }

  const claimed = await claimEmailEventForProcessing(event.id, new Date(), {
    ignoreSchedule: options?.force,
  })

  if (!claimed) {
    const latest = await findEmailEventById(event.id)
    if (!latest) {
      throw new EmailEventNotFoundError()
    }

    return toEmailEventDetailDto(latest)
  }

  const attempts = event.attempts + 1

  try {
    const rendered = await renderEmailTemplate(event.template as never, event.payload)
    const providerResult = await sendEmailNow(
      {
        recipientEmail: event.recipientEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      },
      options?.provider,
    )

    await createEmailLog({
      emailEventId: event.id,
      provider: providerResult.provider,
      providerMessageId: providerResult.providerMessageId,
      recipientEmail: event.recipientEmail,
      recipientUserId: event.recipientUserId,
      status: providerResult.status,
      subject: rendered.subject,
      template: rendered.template,
      sentAt: new Date(),
    })

    const updated = await markEmailEventSent({
      id: event.id,
      attempts,
      processedAt: new Date(),
    })

    return toEmailEventDetailDto(updated)
  } catch (error) {
    const failedAt = new Date()
    const nextAttemptAt = attempts >= event.maxAttempts ? null : calculateNextAttemptAt(attempts)

    await createEmailLog({
      emailEventId: event.id,
      provider: options?.provider?.name ?? 'RESEND',
      recipientEmail: event.recipientEmail,
      recipientUserId: event.recipientUserId,
      status: 'FAILED',
      subject: event.template,
      template: event.template,
      errorMessage: error instanceof Error ? error.message : 'Email processing failed',
    })

    const updated = await markEmailEventFailed({
      id: event.id,
      attempts,
      failedAt,
      nextAttemptAt,
    })

    return toEmailEventDetailDto(updated)
  }
}

export async function getAdminEmails(
  user: SessionUser,
  query: AdminEmailQueryDto,
): Promise<EmailEventListDto> {
  ensureAdmin(user)
  const [items, total] = await Promise.all([
    listEmailEvents(query),
    countEmailEvents(query),
  ])

  return {
    items: items.map(toEmailEventDto),
    total,
    page: query.page,
    limit: query.limit,
  }
}

export async function getAdminEmailById(
  user: SessionUser,
  id: string,
): Promise<EmailEventDetailDto> {
  ensureAdmin(user)
  const event = await findEmailEventById(id)
  if (!event) {
    throw new EmailEventNotFoundError()
  }

  return toEmailEventDetailDto(event)
}

export async function retryEmailEvent(
  user: SessionUser,
  id: string,
  provider?: EmailProvider,
): Promise<EmailEventDetailDto> {
  ensureAdmin(user)
  return processEmailEvent(id, { force: true, provider })
}
