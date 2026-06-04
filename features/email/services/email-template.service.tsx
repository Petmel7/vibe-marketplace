import type { ReactElement } from 'react'
import { render } from '@react-email/render'
import { EmailTemplateRenderError } from '@/lib/errors/email'
import type {
  EmailTemplateKey,
  EmailTemplatePayload,
  RenderedEmailTemplateDto,
} from '../email.dto'
import { emailTemplatePayloadSchemaMap } from '../email.schema'
import OrderConfirmedEmail from '../templates/OrderConfirmedEmail'
import OrderCreatedEmail from '../templates/OrderCreatedEmail'
import PaymentFailedEmail from '../templates/PaymentFailedEmail'
import PaymentSucceededEmail from '../templates/PaymentSucceededEmail'
import ProductApprovedEmail from '../templates/ProductApprovedEmail'
import ProductRejectedEmail from '../templates/ProductRejectedEmail'
import RefundApprovedEmail from '../templates/RefundApprovedEmail'
import RefundFailedEmail from '../templates/RefundFailedEmail'
import RefundRejectedEmail from '../templates/RefundRejectedEmail'
import RefundRequestedEmail from '../templates/RefundRequestedEmail'
import RefundSucceededEmail from '../templates/RefundSucceededEmail'
import SellerApprovedEmail from '../templates/SellerApprovedEmail'
import SellerNewOrderEmail from '../templates/SellerNewOrderEmail'
import SellerPayoutPaidEmail from '../templates/SellerPayoutPaidEmail'
import SellerRejectedEmail from '../templates/SellerRejectedEmail'
import WelcomeEmail from '../templates/WelcomeEmail'

type TemplateDefinition<TTemplate extends EmailTemplateKey = EmailTemplateKey> = {
  render: (payload: EmailTemplatePayload<TTemplate>) => ReactElement
  subject: (payload: EmailTemplatePayload<TTemplate>) => string
}

const templateDefinitions: {
  [TTemplate in EmailTemplateKey]: TemplateDefinition<TTemplate>
} = {
  WELCOME_EMAIL: {
    render: (payload) => <WelcomeEmail {...payload} />,
    subject: () => 'Welcome to vibe-marketplace',
  },
  ORDER_CREATED_EMAIL: {
    render: (payload) => <OrderCreatedEmail {...payload} />,
    subject: (payload) => `Order ${payload.orderId} created`,
  },
  ORDER_CONFIRMED_EMAIL: {
    render: (payload) => <OrderConfirmedEmail {...payload} />,
    subject: (payload) => `Order ${payload.orderId} confirmed`,
  },
  SELLER_APPROVED_EMAIL: {
    render: (payload) => <SellerApprovedEmail {...payload} />,
    subject: () => 'Your seller account was approved',
  },
  SELLER_REJECTED_EMAIL: {
    render: (payload) => <SellerRejectedEmail {...payload} />,
    subject: () => 'Your seller application needs updates',
  },
  PRODUCT_APPROVED_EMAIL: {
    render: (payload) => <ProductApprovedEmail {...payload} />,
    subject: (payload) => `Product approved: ${payload.productName}`,
  },
  PRODUCT_REJECTED_EMAIL: {
    render: (payload) => <ProductRejectedEmail {...payload} />,
    subject: (payload) => `Product needs updates: ${payload.productName}`,
  },
  PAYMENT_SUCCEEDED_EMAIL: {
    render: (payload) => <PaymentSucceededEmail {...payload} />,
    subject: (payload) => `Payment received for order ${payload.orderId}`,
  },
  PAYMENT_FAILED_EMAIL: {
    render: (payload) => <PaymentFailedEmail {...payload} />,
    subject: (payload) => `Payment issue for order ${payload.orderId}`,
  },
  REFUND_REQUESTED_EMAIL: {
    render: (payload) => <RefundRequestedEmail {...payload} />,
    subject: (payload) => `Refund request created for order ${payload.orderId}`,
  },
  REFUND_APPROVED_EMAIL: {
    render: (payload) => <RefundApprovedEmail {...payload} />,
    subject: (payload) => `Refund approved for order ${payload.orderId}`,
  },
  REFUND_REJECTED_EMAIL: {
    render: (payload) => <RefundRejectedEmail {...payload} />,
    subject: (payload) => `Refund request update for order ${payload.orderId}`,
  },
  REFUND_SUCCEEDED_EMAIL: {
    render: (payload) => <RefundSucceededEmail {...payload} />,
    subject: (payload) => `Refund completed for order ${payload.orderId}`,
  },
  REFUND_FAILED_EMAIL: {
    render: (payload) => <RefundFailedEmail {...payload} />,
    subject: (payload) => `Refund needs attention for order ${payload.orderId}`,
  },
  SELLER_NEW_ORDER_EMAIL: {
    render: (payload) => <SellerNewOrderEmail {...payload} />,
    subject: (payload) => `New paid order for ${payload.storeName}`,
  },
  SELLER_PAYOUT_PAID_EMAIL: {
    render: (payload) => <SellerPayoutPaidEmail {...payload} />,
    subject: (payload) => `Payout sent for ${payload.storeName}`,
  },
}

export async function renderEmailTemplate<TTemplate extends EmailTemplateKey>(
  template: TTemplate,
  rawPayload: unknown,
): Promise<RenderedEmailTemplateDto> {
  try {
    const payloadSchema = emailTemplatePayloadSchemaMap[template]
    const payload = payloadSchema.parse(rawPayload) as EmailTemplatePayload<TTemplate>
    const definition = templateDefinitions[template]

    const component = definition.render(payload)
    const [html, text] = await Promise.all([
      render(component),
      render(component, { plainText: true }),
    ])

    return {
      template,
      subject: definition.subject(payload),
      html,
      text,
    }
  } catch (error) {
    if (error instanceof EmailTemplateRenderError) {
      throw error
    }

    throw new EmailTemplateRenderError(
      error instanceof Error ? error.message : 'Email template rendering failed',
    )
  }
}
