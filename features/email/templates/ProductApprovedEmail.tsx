import { Heading, Text } from '@react-email/components'
import EmailLayout from './components/EmailLayout'
import type { ProductApprovedEmailPayload } from '../email.dto'

export default function ProductApprovedEmail({
  productName,
  storeName,
}: ProductApprovedEmailPayload) {
  return (
    <EmailLayout previewText={`${productName} was approved`}>
      <Heading as="h2" style={heading}>Product approved</Heading>
      <Text style={copy}>
        Your product <strong>{productName}</strong> from {storeName} was approved and is ready for
        buyers to discover.
      </Text>
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
