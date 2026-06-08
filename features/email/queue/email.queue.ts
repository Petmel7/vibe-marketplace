import type { EmailEventDto, EmailEventDetailDto, EnqueueEmailEventDto } from '../email.dto'
import { enqueueEmail, processEmailEvent } from '../email.service'
import { enqueueEmailJob } from '@/features/jobs/jobs.queue'
import { logError } from '@/utils/logger'

export async function enqueueEmailEvent(input: EnqueueEmailEventDto): Promise<EmailEventDto> {
  const event = await enqueueEmail(input)

  void enqueueEmailJob(event.id).catch((error) => {
    logError('email:enqueue-delivery-job', error, {
      domain: 'email',
      emailEventId: event.id,
    })
  })

  return event
}

export function processQueuedEmailEvent(eventId: string): Promise<EmailEventDetailDto> {
  return processEmailEvent(eventId)
}
