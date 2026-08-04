import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { handleApiRoute } from './route'

describe('handleApiRoute', () => {
  it('wraps returned data in the standard success response', async () => {
    const response = await handleApiRoute('test:success', () => ({ id: 'item-1' }))

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { id: 'item-1' },
    })
    expect(response.status).toBe(200)
  })

  it('respects custom success status codes', async () => {
    const response = await handleApiRoute('test:created', () => ({ id: 'item-1' }), {
      status: 201,
    })

    expect(response.status).toBe(201)
  })

  it('returns explicit Response objects unchanged', async () => {
    const passthrough = Response.json(
      { success: false, error: { message: 'No session', code: 'UNAUTHORIZED' } },
      { status: 401 },
    )

    const response = await handleApiRoute('test:passthrough', () => passthrough)

    expect(response).toBe(passthrough)
  })

  it('maps Zod validation failures through the standard error mapper', async () => {
    const response = await handleApiRoute('test:validation', () =>
      z.object({ id: z.string().uuid() }).parse({ id: 'not-a-uuid' }),
    )

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        message: 'Invalid UUID',
        code: 'VALIDATION_ERROR',
      },
    })
    expect(response.status).toBe(400)
  })
})
