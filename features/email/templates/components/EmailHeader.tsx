import { Heading, Section, Text } from '@react-email/components'

export default function EmailHeader() {
  return (
    <Section style={section}>
      <Text style={eyebrow}>vibe-marketplace</Text>
      <Heading as="h1" style={heading}>
        Marketplace updates
      </Heading>
    </Section>
  )
}

const section = {
  padding: '32px 32px 8px',
}

const eyebrow = {
  color: '#7dd3fc',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.22em',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
}

const heading = {
  color: '#f5f7fb',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '34px',
  margin: '0',
}
