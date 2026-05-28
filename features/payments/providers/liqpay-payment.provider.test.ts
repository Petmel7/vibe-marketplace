import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { PaymentProvider, PaymentStatus } from '@/app/generated/prisma/client'
import { LiqPayPayloadError, LiqPayStatusMappingError } from '@/lib/errors/payment'
import { LiqPayPaymentProvider } from './liqpay-payment.provider'

function sign(privateKey: string, data: string) {
  return createHash('sha3-256')
    .update(`${privateKey}${data}${privateKey}`, 'utf8')
    .digest('base64')
}

const provider = new LiqPayPaymentProvider({
  publicKey: 'public-key',
  privateKey: 'private-key',
  sandbox: false,
  appUrl: 'https://app.example.com',
})

describe('LiqPayPaymentProvider', () => {
  it('generates checkout data and signature for hosted payments', async () => {
    const result = await provider.createPayment({
      method: 'CARD',
      amount: '199.99',
      currency: 'UAH',
      orderReference: 'order-ref',
      orderId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      paymentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    })

    expect(result.provider).toBe(PaymentProvider.LIQPAY)
    expect(result.providerPaymentId).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    expect(result.checkoutUrl).toBe(
      'https://app.example.com/api/payments/checkout/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    )
    expect(result.checkoutAction?.checkoutUrl).toBe('https://www.liqpay.ua/api/3/checkout')
    expect(result.checkoutAction?.signature).toBe(
      sign('private-key', result.checkoutAction?.data ?? ''),
    )

    const decodedPayload = JSON.parse(
      Buffer.from(result.checkoutAction?.data ?? '', 'base64').toString('utf8'),
    ) as Record<string, string>

    expect(decodedPayload.order_id).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    expect(decodedPayload.public_key).toBe('public-key')
    expect(decodedPayload.result_url).toContain(
      '/checkout/pending/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    )
    expect(decodedPayload.server_url).toBe('https://app.example.com/api/payments/webhooks/liqpay')
  })

  it('includes the sandbox flag when sandbox mode is enabled', async () => {
    const sandboxProvider = new LiqPayPaymentProvider({
      publicKey: 'public-key',
      privateKey: 'private-key',
      sandbox: true,
      appUrl: 'https://app.example.com',
    })

    const result = await sandboxProvider.createPayment({
      method: 'CARD',
      amount: '99.98',
      currency: 'UAH',
      orderReference: 'order-ref',
      orderId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      paymentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    })

    const decodedPayload = JSON.parse(
      Buffer.from(result.checkoutAction?.data ?? '', 'base64').toString('utf8'),
    ) as Record<string, string>

    expect(decodedPayload.sandbox).toBe('1')
  })

  it('verifies callback signatures and parses webhook payloads', async () => {
    const payload = {
      order_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      payment_id: 123456,
      transaction_id: 654321,
      status: 'success',
      amount: '99.98',
      currency: 'UAH',
      type: 'buy',
    }
    const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
    const signature = sign('private-key', data)
    const rawBody = new URLSearchParams({ data, signature }).toString()

    await expect(
      provider.verifyWebhook({
        provider: PaymentProvider.LIQPAY,
        headers: {},
        rawBody,
      }),
    ).resolves.toBe(true)

    const parsed = await provider.parseWebhookEvent({
      provider: PaymentProvider.LIQPAY,
      headers: {},
      rawBody,
    })

    expect(parsed.providerEventId).toBe('654321')
    expect(parsed.providerPaymentId).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    expect(parsed.status).toBe(PaymentStatus.SUCCEEDED)
  })

  it('rejects invalid callback signatures', async () => {
    const payload = {
      order_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      status: 'processing',
    }
    const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
    const rawBody = new URLSearchParams({ data, signature: 'bad-signature' }).toString()

    await expect(
      provider.verifyWebhook({
        provider: PaymentProvider.LIQPAY,
        headers: {},
        rawBody,
      }),
    ).resolves.toBe(false)
  })

  it('throws when callback payload is malformed', async () => {
    const rawBody = new URLSearchParams({
      data: 'not-base64',
      signature: sign('private-key', 'not-base64'),
    }).toString()

    await expect(
      provider.parseWebhookEvent({
        provider: PaymentProvider.LIQPAY,
        headers: {},
        rawBody,
      }),
    ).rejects.toThrow(LiqPayPayloadError)
  })

  it('throws for unsupported LiqPay statuses', async () => {
    const payload = {
      order_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      status: 'mystery_status',
    }
    const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
    const signature = sign('private-key', data)
    const rawBody = new URLSearchParams({ data, signature }).toString()

    await expect(
      provider.parseWebhookEvent({
        provider: PaymentProvider.LIQPAY,
        headers: {},
        rawBody,
      }),
    ).rejects.toThrow(LiqPayStatusMappingError)
  })
})
