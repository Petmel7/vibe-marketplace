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
      buyerEmail: 'buyer@example.com',
      buyerName: 'Olena Buyer',
      itemCount: 2,
      orderDetailsUrl: 'https://app.example.com/profile/orders/33333333-3333-4333-8333-333333333333',
      orderId: '33333333-3333-4333-8333-333333333333',
      orderItems: [
        {
          productName: 'Blue Hoodie',
          quantity: 1,
          storeName: 'North Store',
          unitPrice: '120.00',
          variantLabel: 'L / Blue',
        },
        {
          productName: 'Red Tee',
          quantity: 1,
          storeName: 'South Store',
          unitPrice: '80.00',
          variantLabel: null,
        },
      ],
      orderStatus: 'confirmed',
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'PENDING',
      storeNames: ['North Store', 'South Store'],
      totalAmount: '120.00',
    })

    expect(result.subject).toContain('33333333-3333-4333-8333-333333333333')
    expect(result.html).toContain('120.00')
    expect(result.html).toContain('North Store')
  })

  it('renders payment succeeded content with provider data', async () => {
    const result = await renderEmailTemplate('PAYMENT_SUCCEEDED_EMAIL', {
      buyerEmail: 'buyer@example.com',
      buyerName: 'Olena Buyer',
      itemCount: 1,
      orderDetailsUrl: 'https://app.example.com/profile/orders/33333333-3333-4333-8333-333333333333',
      orderId: '33333333-3333-4333-8333-333333333333',
      orderItems: [
        {
          productName: 'Blue Hoodie',
          quantity: 1,
          storeName: 'North Store',
          unitPrice: '120.00',
          variantLabel: 'L / Blue',
        },
      ],
      orderStatus: 'paid',
      paidAt: '2026-01-01T10:00:00.000Z',
      paymentId: '44444444-4444-4444-8444-444444444444',
      paymentMethod: 'CARD',
      paymentProvider: 'LIQPAY',
      paymentStatus: 'SUCCEEDED',
      storeNames: ['North Store'],
      totalAmount: '120.00',
    })

    expect(result.subject).toContain('33333333-3333-4333-8333-333333333333')
    expect(result.html).toContain('LIQPAY')
  })

  it('throws EmailTemplateRenderError when payload does not match template schema', async () => {
    await expect(
      renderEmailTemplate('PRODUCT_REJECTED_EMAIL', {
        productName: 'Test Product',
      }),
    ).rejects.toThrow(EmailTemplateRenderError)
  })
})
