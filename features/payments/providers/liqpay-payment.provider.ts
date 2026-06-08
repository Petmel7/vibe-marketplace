import { createHash, timingSafeEqual } from 'node:crypto'
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@/app/generated/prisma/client'
import { getServerEnv } from '@/config/env'
import type {
  ParsedPaymentWebhookEvent,
  PaymentPreparationInput,
  PaymentRefundInput,
  PaymentRefundResult,
  PaymentWebhookVerificationInput,
  PreparedPaymentDraft,
} from '@/features/payments/payment.dto'
import {
  LiqPayConfigError,
  LiqPayPayloadError,
  LiqPayStatusMappingError,
  RefundNotSupportedError,
} from '@/lib/errors/payment'
import type { PaymentProviderAdapter } from './payment-provider'

type LiqPayConfig = {
  publicKey: string
  privateKey: string
  sandbox: boolean
  appUrl: string
}

type LiqPayCheckoutPayload = {
  public_key: string
  version: 3
  action: 'pay'
  amount: string
  currency: string
  description: string
  order_id: string
  result_url: string
  server_url: string
  sandbox?: 1
}

type LiqPayWebhookPayload = {
  order_id: string
  payment_id?: number | string
  transaction_id?: number | string
  status: string
  amount?: number | string
  currency?: string
  type?: string
}

const LIQPAY_CHECKOUT_URL = 'https://www.liqpay.ua/api/3/checkout'

function normalizeAppUrl(appUrl: string) {
  return appUrl.replace(/\/+$/, '')
}

function getLiqPayConfigFromEnv(): LiqPayConfig {
  const env = getServerEnv()
  const publicKey = env.LIQPAY_PUBLIC_KEY?.trim()
  const privateKey = env.LIQPAY_PRIVATE_KEY?.trim()
  const sandbox = (process.env.LIQPAY_SANDBOX ?? 'false').trim().toLowerCase()
  const appUrl = env.APP_URL?.trim()

  if (!publicKey) {
    throw new LiqPayConfigError('LIQPAY_PUBLIC_KEY is not configured')
  }

  if (!privateKey) {
    throw new LiqPayConfigError('LIQPAY_PRIVATE_KEY is not configured')
  }

  if (!appUrl) {
    throw new LiqPayConfigError('APP_URL is not configured')
  }

  try {
    const normalizedUrl = normalizeAppUrl(appUrl)
    new URL(normalizedUrl)

    return {
      publicKey,
      privateKey,
      sandbox: sandbox === 'true',
      appUrl: normalizedUrl,
    }
  } catch {
    throw new LiqPayConfigError('APP_URL must be a valid absolute URL')
  }
}

function parseWebhookFormBody(rawBody: string) {
  const params = new URLSearchParams(rawBody)
  const data = params.get('data')
  const signature = params.get('signature')

  if (!data || !signature) {
    throw new LiqPayPayloadError('LiqPay callback payload must include data and signature')
  }

  return { data, signature }
}

function decodeWebhookPayload(data: string): LiqPayWebhookPayload {
  try {
    const jsonString = Buffer.from(data, 'base64').toString('utf8')
    return JSON.parse(jsonString) as LiqPayWebhookPayload
  } catch {
    throw new LiqPayPayloadError('LiqPay callback data could not be decoded')
  }
}

function normalizeAmount(amount: string) {
  const normalized = amount.trim().replace(',', '.')

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new LiqPayPayloadError('LiqPay payment amount must be a dot-decimal string')
  }

  return normalized
}

function signLiqPayPayload(privateKey: string, data: string) {
  return createHash('sha1')
    .update(`${privateKey}${data}${privateKey}`, 'utf8')
    .digest('base64')
}

function logLiqPayPayloadDiagnostics(payload: LiqPayCheckoutPayload) {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  console.info('[LiqPay] checkout payload prepared', {
    public_key: payload.public_key,
    version: payload.version,
    action: payload.action,
    amount: payload.amount,
    currency: payload.currency,
    order_id: payload.order_id,
    has_result_url: Boolean(payload.result_url),
    has_server_url: Boolean(payload.server_url),
    sandbox: payload.sandbox ?? 0,
  })
}

function mapLiqPayStatus(status: string): PaymentStatus {
  switch (status) {
    case 'success':
    case 'sandbox':
      return PaymentStatus.SUCCEEDED
    case 'failure':
    case 'error':
      return PaymentStatus.FAILED
    case 'reversed':
      return PaymentStatus.REFUNDED
    case 'subscribed':
    case 'wait_secure3ds':
    case '3ds_verify':
    case 'processing':
      return PaymentStatus.PROCESSING
    default:
      throw new LiqPayStatusMappingError(status)
  }
}

function toWebhookEventType(payload: LiqPayWebhookPayload) {
  return payload.type ?? payload.status
}

function toProviderEventId(payload: LiqPayWebhookPayload) {
  return String(payload.transaction_id ?? payload.payment_id ?? `${payload.order_id}:${payload.status}`)
}

export class LiqPayPaymentProvider implements PaymentProviderAdapter {
  providerName = PaymentProvider.LIQPAY

  constructor(private readonly config: LiqPayConfig = getLiqPayConfigFromEnv()) {}

  async createPayment(input: PaymentPreparationInput): Promise<PreparedPaymentDraft> {
    const resultUrl = `${this.config.appUrl}/checkout/pending/${input.orderId}?paymentMethod=CARD&paymentStatus=PROCESSING&nextAction=AWAITING_PROVIDER_CONFIRMATION`
    const serverUrl = `${this.config.appUrl}/api/payments/webhooks/liqpay`
    const amount = normalizeAmount(input.amount)
    const payload: LiqPayCheckoutPayload = {
      public_key: this.config.publicKey,
      version: 3,
      action: 'pay',
      amount,
      currency: 'UAH',
      description: `Marketplace order #${input.orderId.slice(0, 8)}`,
      order_id: input.paymentId,
      result_url: resultUrl,
      server_url: serverUrl,
      ...(this.config.sandbox ? { sandbox: 1 } : {}),
    }

    const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
    const signature = signLiqPayPayload(this.config.privateKey, data)
    logLiqPayPayloadDiagnostics(payload)

    return {
      provider: PaymentProvider.LIQPAY,
      providerPaymentId: input.paymentId,
      status: PaymentStatus.PROCESSING,
      method: PaymentMethod.CARD,
      amount,
      currency: 'UAH',
      checkoutUrl: `${this.config.appUrl}/api/payments/checkout/${input.paymentId}`,
      failureReason: null,
      paidAt: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      nextAction: 'AWAITING_PROVIDER_CONFIRMATION',
      checkoutAction: {
        provider: PaymentProvider.LIQPAY,
        checkoutAction: 'POST_FORM',
        checkoutUrl: LIQPAY_CHECKOUT_URL,
        data,
        signature,
        paymentId: input.paymentId,
        orderId: input.orderId,
      },
    }
  }

  async verifyWebhook(input: PaymentWebhookVerificationInput): Promise<boolean> {
    const { data, signature } = parseWebhookFormBody(input.rawBody)
    const expectedSignature = signLiqPayPayload(this.config.privateKey, data)

    const left = Buffer.from(signature, 'utf8')
    const right = Buffer.from(expectedSignature, 'utf8')

    if (left.length !== right.length) {
      return false
    }

    return timingSafeEqual(left, right)
  }

  async parseWebhookEvent(input: PaymentWebhookVerificationInput): Promise<ParsedPaymentWebhookEvent> {
    const { data } = parseWebhookFormBody(input.rawBody)
    const payload = decodeWebhookPayload(data)

    if (!payload.order_id) {
      throw new LiqPayPayloadError('LiqPay callback does not contain order_id')
    }

    const status = mapLiqPayStatus(payload.status)

    return {
      provider: PaymentProvider.LIQPAY,
      providerEventId: toProviderEventId(payload),
      providerPaymentId: payload.order_id,
      eventType: toWebhookEventType(payload),
      amount: payload.amount != null ? String(payload.amount) : null,
      currency: payload.currency ?? null,
      status,
      payload,
      signatureValid: true,
    }
  }

  async refundPayment(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    void input
    throw new RefundNotSupportedError('LiqPay refunds are not supported in the marketplace payment infrastructure yet')
  }
}
