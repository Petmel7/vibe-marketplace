import { Hr, Section, Text } from '@react-email/components'

export default function EmailFooter() {
  return (
    <Section style={section}>
      <Hr style={divider} />
      <Text style={copy}>
        You are receiving this message because it relates to your marketplace account activity.
      </Text>
    </Section>
  )
}

const section = {
  padding: '0 32px 24px',
}

const divider = {
  borderColor: '#2a313d',
  margin: '0 0 16px',
}

const copy = {
  color: '#9ba6b5',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '0',
}
