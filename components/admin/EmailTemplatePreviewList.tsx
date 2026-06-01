import { render } from '@react-email/render'
import WelcomeEmail from '@/features/email/templates/WelcomeEmail'
import OrderCreatedEmail from '@/features/email/templates/OrderCreatedEmail'
import OrderConfirmedEmail from '@/features/email/templates/OrderConfirmedEmail'
import SellerApprovedEmail from '@/features/email/templates/SellerApprovedEmail'
import SellerRejectedEmail from '@/features/email/templates/SellerRejectedEmail'
import ProductApprovedEmail from '@/features/email/templates/ProductApprovedEmail'
import ProductRejectedEmail from '@/features/email/templates/ProductRejectedEmail'
import EmailTemplatePreviewFrame from '@/components/admin/EmailTemplatePreviewFrame'

const TEMPLATE_PREVIEWS = [
  {
    key: 'WELCOME_EMAIL',
    title: 'Welcome email',
    description: 'Sent after an account is first synchronized into the marketplace.',
    render: () => <WelcomeEmail displayName="Olena Buyer" email="olena@example.com" />,
  },
  {
    key: 'ORDER_CREATED_EMAIL',
    title: 'Order created email',
    description: 'Confirms that checkout succeeded and an order record now exists.',
    render: () => (
      <OrderCreatedEmail
        buyerEmail="olena@example.com"
        buyerName="Olena Buyer"
        itemCount={3}
        orderDetailsUrl="https://app.example.com/profile/orders/33333333-3333-4333-8333-333333333333"
        orderId="33333333-3333-4333-8333-333333333333"
        orderItems={[
          {
            productName: 'Blue Hoodie',
            quantity: 2,
            storeName: 'North Store',
            unitPrice: '799.00',
            variantLabel: 'L / Blue',
          },
          {
            productName: 'Red Tee',
            quantity: 1,
            storeName: 'South Store',
            unitPrice: '901.00',
            variantLabel: null,
          },
        ]}
        orderStatus="confirmed"
        paymentMethod="CASH_ON_DELIVERY"
        paymentStatus="PENDING"
        storeNames={['North Store', 'South Store']}
        totalAmount="2499.00"
      />
    ),
  },
  {
    key: 'ORDER_CONFIRMED_EMAIL',
    title: 'Order confirmed email',
    description: 'Sent when order status transitions into confirmed processing.',
    render: () => (
      <OrderConfirmedEmail
        buyerEmail="olena@example.com"
        buyerName="Olena Buyer"
        itemCount={3}
        orderDetailsUrl="https://app.example.com/profile/orders/44444444-4444-4444-8444-444444444444"
        orderId="44444444-4444-4444-8444-444444444444"
        orderItems={[
          {
            productName: 'Blue Hoodie',
            quantity: 2,
            storeName: 'North Store',
            unitPrice: '799.00',
            variantLabel: 'L / Blue',
          },
          {
            productName: 'Red Tee',
            quantity: 1,
            storeName: 'South Store',
            unitPrice: '901.00',
            variantLabel: null,
          },
        ]}
        orderStatus="confirmed"
        paymentMethod="CASH_ON_DELIVERY"
        paymentStatus="PENDING"
        storeNames={['North Store', 'South Store']}
        totalAmount="2499.00"
      />
    ),
  },
  {
    key: 'SELLER_APPROVED_EMAIL',
    title: 'Seller approved email',
    description: 'Sent after marketplace moderation approves a seller profile.',
    render: () => <SellerApprovedEmail businessName="Dnipro Atelier" />,
  },
  {
    key: 'SELLER_REJECTED_EMAIL',
    title: 'Seller rejected email',
    description: 'Sent when a seller application needs corrections before approval.',
    render: () => (
      <SellerRejectedEmail
        businessName="Dnipro Atelier"
        reason="Please upload complete verification documents for moderation review."
      />
    ),
  },
  {
    key: 'PRODUCT_APPROVED_EMAIL',
    title: 'Product approved email',
    description: 'Sent after a pending product passes marketplace moderation.',
    render: () => <ProductApprovedEmail productName="Linen Summer Dress" storeName="Dnipro Atelier" />,
  },
  {
    key: 'PRODUCT_REJECTED_EMAIL',
    title: 'Product rejected email',
    description: 'Sent when a product needs moderation fixes before it can be published.',
    render: () => (
      <ProductRejectedEmail
        productName="Linen Summer Dress"
        storeName="Dnipro Atelier"
        reason="Please replace the primary image with a clearer product shot."
      />
    ),
  },
] as const

export default async function EmailTemplatePreviewList() {
  const renderedTemplates = await Promise.all(
    TEMPLATE_PREVIEWS.map(async (preview) => ({
      ...preview,
      html: await render(preview.render()),
    })),
  )

  return (
    <div className="space-y-6">
      {renderedTemplates.map((preview) => (
        <EmailTemplatePreviewFrame
          key={preview.key}
          title={preview.title}
          description={preview.description}
          html={preview.html}
        />
      ))}
    </div>
  )
}
