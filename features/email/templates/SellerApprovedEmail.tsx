import { Heading, Text } from '@react-email/components'
import EmailLayout from './components/EmailLayout'
import type { SellerApprovedEmailPayload } from '../email.dto'

export default function SellerApprovedEmail({ businessName }: SellerApprovedEmailPayload) {
  return (
    <EmailLayout previewText="Your seller account was approved">
      <Heading as="h2" style={heading}>Seller account approved</Heading>
      <Text style={copy}>
        {businessName ? `${businessName} has` : 'Your seller account has'} been approved. You can
        now continue with storefront setup and start selling.
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
