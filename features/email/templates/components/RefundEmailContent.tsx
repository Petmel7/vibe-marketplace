import { Heading, Section, Text } from '@react-email/components'
import type { RefundLifecycleEmailPayload } from '../../email.dto'
import EmailButton from './EmailButton'

type RefundEmailContentProps = {
  ctaLabel: string
  intro: string
  payload: RefundLifecycleEmailPayload
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

export default function RefundEmailContent({
  ctaLabel,
  intro,
  payload,
  title,
}: RefundEmailContentProps) {
  return (
    <>
      <Heading as="h2" style={heading}>
        {title}
      </Heading>
      <Text style={copy}>{intro}</Text>
      <Text style={copy}>Refund request ID: {payload.refundRequestId}</Text>
      <Text style={copy}>Order ID: {payload.orderId}</Text>
      <Text style={copy}>Refund amount: {payload.refundAmount} {payload.currency}</Text>
      <Text style={copy}>Refund reason: {humanizeValue(payload.reason)}</Text>
      <Text style={copy}>Refund status: {humanizeValue(payload.status)}</Text>
      <Text style={copy}>Payment status: {humanizeValue(payload.paymentStatus)}</Text>
      {payload.productName ? <Text style={copy}>Product: {payload.productName}</Text> : null}
      {payload.storeName ? <Text style={copy}>Store: {payload.storeName}</Text> : null}
      {payload.buyerName ? <Text style={copy}>Buyer: {payload.buyerName}</Text> : null}
      {payload.adminNote ? <Text style={note}>Support note: {payload.adminNote}</Text> : null}
      <Section style={buttonRow}>
        <EmailButton href={payload.actionUrl}>{ctaLabel}</EmailButton>
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

const note = {
  color: '#fbcfe8',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 12px',
}

const buttonRow = {
  marginTop: '22px',
}
