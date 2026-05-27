import { Heading, Text } from '@react-email/components'
import EmailLayout from './components/EmailLayout'
import type { SellerRejectedEmailPayload } from '../email.dto'

export default function SellerRejectedEmail({
  businessName,
  reason,
}: SellerRejectedEmailPayload) {
  return (
    <EmailLayout previewText="Your seller application needs updates">
      <Heading as="h2" style={heading}>Seller application update</Heading>
      <Text style={copy}>
        {businessName ? `${businessName} was` : 'Your seller application was'} not approved yet.
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
