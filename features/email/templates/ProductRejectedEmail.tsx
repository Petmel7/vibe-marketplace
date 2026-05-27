import { Heading, Text } from '@react-email/components'
import EmailLayout from './components/EmailLayout'
import type { ProductRejectedEmailPayload } from '../email.dto'

export default function ProductRejectedEmail({
  productName,
  reason,
  storeName,
}: ProductRejectedEmailPayload) {
  return (
    <EmailLayout previewText={`${productName} needs changes`}>
      <Heading as="h2" style={heading}>Product needs updates</Heading>
      <Text style={copy}>
        Your product <strong>{productName}</strong> from {storeName} was not approved yet.
      </Text>
      <Text style={copy}>Reason: {reason}</Text>
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
