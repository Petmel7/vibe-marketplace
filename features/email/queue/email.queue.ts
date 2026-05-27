import type { EmailEventDto, EmailEventDetailDto, EnqueueEmailEventDto } from '../email.dto'
import { enqueueEmail, processEmailEvent } from '../email.service'

export function enqueueEmailEvent(input: EnqueueEmailEventDto): Promise<EmailEventDto> {
  return enqueueEmail(input)
}

export function processQueuedEmailEvent(eventId: string): Promise<EmailEventDetailDto> {
  return processEmailEvent(eventId)
}
