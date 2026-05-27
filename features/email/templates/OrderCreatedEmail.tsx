import { Heading, Text } from '@react-email/components'
import EmailLayout from './components/EmailLayout'
import type { OrderCreatedEmailPayload } from '../email.dto'

export default function OrderCreatedEmail({
  itemCount,
  orderId,
  totalAmount,
}: OrderCreatedEmailPayload) {
  return (
    <EmailLayout previewText={`Order ${orderId} was created`}>
      <Heading as="h2" style={heading}>Your order was created</Heading>
      <Text style={copy}>Order ID: {orderId}</Text>
      <Text style={copy}>Items: {itemCount}</Text>
      <Text style={copy}>Total: {totalAmount}</Text>
    </EmailLayout>
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
  margin: '0 0 14px',
}
