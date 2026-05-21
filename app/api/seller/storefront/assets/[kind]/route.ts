import { requireAuth } from '@/lib/session/getSession'
import { requireSeller } from '@/lib/auth/guards'
import { toErrorResponse } from '@/lib/errors/handleError'
import { storeAssetKindSchema } from '@/features/media/media.schema'
import { uploadStorefrontAsset } from '@/features/storefront/storefront.service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    requireSeller(user)

    const { kind } = await params
    const parsedKind = storeAssetKindSchema.safeParse(kind)

    if (!parsedKind.success) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: parsedKind.error.flatten(),
          },
        },
        { status: 400 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: { file: ['A valid file upload is required'] },
          },
        },
        { status: 400 },
      )
    }

    const data = await uploadStorefrontAsset(user, parsedKind.data, file)
    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return toErrorResponse('POST /api/seller/storefront/assets/[kind]', err)
  }
}
