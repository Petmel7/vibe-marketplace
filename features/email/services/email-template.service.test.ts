import { describe, expect, it } from 'vitest'
import { EmailTemplateRenderError } from '@/lib/errors/email'
import { renderEmailTemplate } from './email-template.service'

describe('renderEmailTemplate', () => {
  it('renders the welcome template with typed payload data', async () => {
    const result = await renderEmailTemplate('WELCOME_EMAIL', {
      displayName: 'Olena',
      email: 'olena@example.com',
    })

    expect(result.subject).toBe('Welcome to vibe-marketplace')
    expect(result.html).toContain('Olena')
    expect(result.text.toLowerCase()).toContain('welcome to vibe-marketplace')
  })

  it('renders order created content with payload values', async () => {
    const result = await renderEmailTemplate('ORDER_CREATED_EMAIL', {
      orderId: '33333333-3333-4333-8333-333333333333',
      itemCount: 2,
      totalAmount: '120.00',
    })

    expect(result.subject).toContain('33333333-3333-4333-8333-333333333333')
    expect(result.html).toContain('120.00')
  })

  it('throws EmailTemplateRenderError when payload does not match template schema', async () => {
    await expect(
      renderEmailTemplate('PRODUCT_REJECTED_EMAIL', {
        productName: 'Test Product',
      }),
    ).rejects.toThrow(EmailTemplateRenderError)
  })
})
