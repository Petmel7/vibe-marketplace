import { Resend } from 'resend'
import { EmailDeliveryStatus, EmailProvider as EmailProviderName } from '@/app/generated/prisma/client'
import { EmailProviderError } from '@/lib/errors/email'
import type { SendEmailNowInput } from '../email.dto'
import type { EmailProvider } from './email-provider'

export class ResendEmailProvider implements EmailProvider {
  readonly name = EmailProviderName.RESEND

  private readonly client: Resend
  private readonly from: string
  private readonly replyTo: string | null

  constructor(config?: { apiKey?: string; from?: string; replyTo?: string | null }) {
    const apiKey = config?.apiKey ?? process.env.RESEND_API_KEY
    const from = config?.from ?? process.env.EMAIL_FROM

    if (!apiKey) {
      throw new EmailProviderError('RESEND_API_KEY is not configured')
    }

    if (!from) {
      throw new EmailProviderError('EMAIL_FROM is not configured')
    }

    this.client = new Resend(apiKey)
    this.from = from
    this.replyTo = config?.replyTo ?? process.env.EMAIL_REPLY_TO ?? null
  }

  async send(input: SendEmailNowInput): Promise<{
    providerMessageId: string | null
    status: EmailDeliveryStatus
  }> {
    try {
      const response = await this.client.emails.send({
        from: this.from,
        to: [input.recipientEmail],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ?? this.replyTo ? { replyTo: input.replyTo ?? this.replyTo ?? undefined } : {}),
      })

      if (response.error) {
        throw new EmailProviderError(response.error.message || 'Resend failed to send email')
      }

      return {
        providerMessageId: response.data?.id ?? null,
        status: EmailDeliveryStatus.SENT,
      }
    } catch (error) {
      if (error instanceof EmailProviderError) {
        throw error
      }

      throw new EmailProviderError(
        error instanceof Error ? error.message : 'Resend failed to send email',
      )
    }
  }
}
