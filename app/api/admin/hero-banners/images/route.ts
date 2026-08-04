import { z } from 'zod'
import { heroBannerImageSlotSchema } from '@/features/media/media.schema'
import {
  deleteHeroBannerImageBinary,
  uploadHeroBannerImageBinary,
} from '@/features/media/media.service'
import { requireAdmin } from '@/lib/auth/guards'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'
import { UPLOAD_BUCKETS } from '@/lib/upload/upload.config'
import { cleanupStoredUpload } from '@/lib/upload/upload.service'

const removeHeroBannerImageSchema = z.object({
  storagePath: z.string().trim().min(1).max(1024),
})

function validationErrorResponse(details: unknown) {
  return Response.json(
    {
      success: false,
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details,
      },
    },
    { status: 400 },
  )
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    requireAdmin(user)

    const formData = await request.formData()
    const parsedSlot = heroBannerImageSlotSchema.safeParse(formData.get('slot'))
    if (!parsedSlot.success) {
      return validationErrorResponse(parsedSlot.error.flatten())
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return validationErrorResponse({ file: ['A valid file upload is required'] })
    }

    const data = await uploadHeroBannerImageBinary({
      slot: parsedSlot.data,
      file,
    })

    return Response.json({ success: true, data }, { status: 201 })
  } catch (error) {
    return toErrorResponse('POST /api/admin/hero-banners/images', error)
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    requireAdmin(user)

    const parsed = removeHeroBannerImageSchema.safeParse(await request.json())
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten())
    }

    await cleanupStoredUpload({
      previous: {
        bucket: UPLOAD_BUCKETS.heroBanners,
        storagePath: parsed.data.storagePath,
      },
      deleteObject: deleteHeroBannerImageBinary,
      label: 'hero-banner:image:remove-cleanup',
    })

    return Response.json({ success: true, data: null })
  } catch (error) {
    return toErrorResponse('DELETE /api/admin/hero-banners/images', error)
  }
}
