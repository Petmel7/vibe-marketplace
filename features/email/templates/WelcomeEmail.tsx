import { Heading, Text } from '@react-email/components'
import EmailLayout from './components/EmailLayout'
import type { WelcomeEmailPayload } from '../email.dto'

export default function WelcomeEmail({ displayName, email }: WelcomeEmailPayload) {
  const greeting = displayName?.trim() || email

  return (
    <EmailLayout previewText="Welcome to vibe-marketplace">
      <Heading as="h2" style={heading}>Welcome to vibe-marketplace</Heading>
      <Text style={copy}>Hi {greeting},</Text>
      <Text style={copy}>
        Your account is ready. You can start browsing products, saving favorites, and placing
        orders across the marketplace.
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
