import { requireAuth } from '@/lib/session/getSession'
import { toErrorResponse } from '@/lib/errors/handleError'
import { productImageUploadMetadataSchema, reorderProductImagesSchema } from '@/features/media/media.schema'
import {
  listProductImages,
  reorderProductImages,
  uploadProductImage,
} from '@/features/seller/products/seller-product.service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await listProductImages(user, id)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/seller/products/[id]/images', err)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params

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

    const parsed = productImageUploadMetadataSchema.safeParse({
      altText: formData.get('altText') ?? undefined,
      position: formData.get('position') ?? undefined,
      isPrimary: formData.get('isPrimary') ?? undefined,
    })

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      )
    }

    const data = await uploadProductImage(user, id, {
      file,
      ...parsed.data,
    })
    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return toErrorResponse('POST /api/seller/products/[id]/images', err)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const parsed = reorderProductImagesSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      )
    }

    const data = await reorderProductImages(user, id, parsed.data.images)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('PATCH /api/seller/products/[id]/images', err)
  }
}
