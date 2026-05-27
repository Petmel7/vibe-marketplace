import { Button } from '@react-email/components'

export default function EmailButton({
  children,
  href,
}: {
  children: string
  href: string
}) {
  return (
    <Button href={href} style={button}>
      {children}
    </Button>
  )
}

const button = {
  backgroundColor: '#44c7ff',
  borderRadius: '14px',
  color: '#0f1115',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '700',
  padding: '12px 18px',
  textDecoration: 'none',
}
