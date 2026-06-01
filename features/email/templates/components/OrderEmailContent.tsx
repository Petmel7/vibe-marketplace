import { Heading, Hr, Section, Text } from '@react-email/components'
import type {
  MarketplaceOrderEmailPayload,
  OrderEmailItemPayload,
  SellerNewOrderEmailPayload,
} from '../../email.dto'
import EmailButton from './EmailButton'

type OrderEmailContentProps = {
  ctaLabel: string
  intro: string
  payload: MarketplaceOrderEmailPayload | SellerNewOrderEmailPayload
  showBuyerEmail?: boolean
  title: string
}

function humanizeValue(value: string | null): string {
  if (!value) {
    return 'Not set'
  }

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function renderOrderItem(item: OrderEmailItemPayload, index: number) {
  return (
    <Section key={`${item.productName}-${index}`} style={itemCard}>
      <Text style={itemTitle}>{item.productName}</Text>
      <Text style={itemMeta}>
        {item.variantLabel ? `${item.variantLabel} • ` : ''}
        {item.storeName}
      </Text>
      <Text style={itemMeta}>
        Qty: {item.quantity} • Unit price: {item.unitPrice}
      </Text>
    </Section>
  )
}

export default function OrderEmailContent({
  ctaLabel,
  intro,
  payload,
  showBuyerEmail = false,
  title,
}: OrderEmailContentProps) {
  return (
    <>
      <Heading as="h2" style={heading}>
        {title}
      </Heading>
      <Text style={copy}>{intro}</Text>
      <Text style={copy}>Order ID: {payload.orderId}</Text>
      <Text style={copy}>Total: {payload.totalAmount} UAH</Text>
      <Text style={copy}>Items: {payload.itemCount}</Text>
      {'storeName' in payload ? (
        <Text style={copy}>Store: {payload.storeName}</Text>
      ) : (
        <Text style={copy}>Stores: {payload.storeNames.join(', ')}</Text>
      )}
      <Text style={copy}>Order status: {humanizeValue(payload.orderStatus)}</Text>
      <Text style={copy}>Payment method: {humanizeValue(payload.paymentMethod)}</Text>
      <Text style={copy}>Payment status: {humanizeValue(payload.paymentStatus)}</Text>
      {payload.buyerName ? <Text style={copy}>Buyer: {payload.buyerName}</Text> : null}
      {showBuyerEmail ? <Text style={copy}>Buyer email: {payload.buyerEmail}</Text> : null}
      <Hr style={divider} />
      <Text style={sectionLabel}>Order items</Text>
      {payload.orderItems.map(renderOrderItem)}
      <Section style={buttonRow}>
        <EmailButton href={payload.orderDetailsUrl}>{ctaLabel}</EmailButton>
      </Section>
    </>
  )
}

const heading = {
  color: '#f5f7fb',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 16px',
}

const copy = {
  color: '#d3dae6',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px',
}

const sectionLabel = {
  color: '#f5f7fb',
  fontSize: '14px',
  fontWeight: '700',
  lineHeight: '22px',
  margin: '0 0 12px',
}

const divider = {
  borderColor: '#2a313d',
  margin: '18px 0',
}

const itemCard = {
  backgroundColor: '#0f1115',
  border: '1px solid #2a313d',
  borderRadius: '16px',
  marginBottom: '10px',
  padding: '14px 16px',
}

const itemTitle = {
  color: '#f5f7fb',
  fontSize: '15px',
  fontWeight: '700',
  lineHeight: '22px',
  margin: '0 0 4px',
}

const itemMeta = {
  color: '#b7c1cf',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 4px',
}

const buttonRow = {
  marginTop: '22px',
}
