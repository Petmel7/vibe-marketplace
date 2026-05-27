import { EmailDeliveryStatus } from '@/app/generated/prisma/client'
import { ResendEmailProvider } from '../providers/resend-email.provider'
import type { EmailProvider } from '../providers/email-provider'
import type { SendEmailNowInput, SendEmailNowResult } from '../email.dto'

export function createConfiguredEmailProvider(): EmailProvider {
  return new ResendEmailProvider()
}

export async function sendEmailNowWithProvider(
  provider: EmailProvider,
  input: SendEmailNowInput,
): Promise<SendEmailNowResult> {
  const result = await provider.send(input)

  return {
    provider: provider.name,
    providerMessageId: result.providerMessageId,
    status: result.status ?? EmailDeliveryStatus.SENT,
  }
}
