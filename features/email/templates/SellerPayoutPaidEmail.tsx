import { Button, Heading, Section, Text } from '@react-email/components'
import type { SellerPayoutPaidEmailPayload } from '../email.dto'
import EmailFooter from './components/EmailFooter'
import EmailHeader from './components/EmailHeader'
import EmailLayout from './components/EmailLayout'

export default function SellerPayoutPaidEmail(props: SellerPayoutPaidEmailPayload) {
  return (
    <EmailLayout previewText={`Payout ${props.payoutId} was marked paid`}>
      <EmailHeader />
      <Heading as="h2">Payout sent</Heading>
      <Text>
        {props.sellerName ? `${props.sellerName}, your payout` : 'Your payout'} for store{' '}
        <strong>{props.storeName}</strong> was marked paid.
      </Text>
      <Section>
        <Text>Amount: {props.amount} {props.currency}</Text>
        <Text>Method: {props.payoutMethod}</Text>
        <Text>Status: {props.payoutStatus}</Text>
      </Section>
      <Button href={process.env.NEXT_PUBLIC_APP_URL ? new URL('/seller/finance', process.env.NEXT_PUBLIC_APP_URL).toString() : '/seller/finance'}>
        View seller finance
      </Button>
      <EmailFooter />
    </EmailLayout>
  )
}
