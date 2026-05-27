import * as React from 'react'
import { Body, Container, Head, Html, Preview, Section } from '@react-email/components'
import EmailFooter from './EmailFooter'
import EmailHeader from './EmailHeader'

export default function EmailLayout({
  children,
  previewText,
}: {
  children: React.ReactNode
  previewText: string
}) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          <EmailHeader />
          <Section style={content}>{children}</Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#0f1115',
  color: '#f5f7fb',
  fontFamily: 'Arial, sans-serif',
  margin: '0',
  padding: '24px 0',
}

const container = {
  backgroundColor: '#161a20',
  border: '1px solid #2a313d',
  borderRadius: '24px',
  margin: '0 auto',
  maxWidth: '620px',
  overflow: 'hidden',
}

const content = {
  padding: '8px 32px 32px',
}
