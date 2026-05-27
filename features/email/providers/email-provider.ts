import type { EmailDeliveryStatus, EmailProvider as EmailProviderName } from '@/app/generated/prisma/client'
import type { SendEmailNowInput } from '../email.dto'

export interface EmailProvider {
  readonly name: EmailProviderName
  send(input: SendEmailNowInput): Promise<{
    providerMessageId: string | null
    status: EmailDeliveryStatus
  }>
}
