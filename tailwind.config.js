/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        canvas: '#1D2533',
        panel: '#2A323F',
        panelAlt: '#333A47',
        panelMuted: '#242C39',
        panelBorder: 'rgba(255,255,255,0.1)',
        copy: {
          strong: '#F1F3F5',
          primary: '#E8E9EA',
          secondary: '#D9D9D9',
          muted: 'var(--color-copy-muted)',
        },
        brand: {
          DEFAULT: '#9466FF',
          accent: '#16D9A6',
          success: '#26DA72',
          danger: '#FF4D6D',
        },
        icon: '#565C66',
        media: '#2A3347',
      },
      spacing: {
        18: '4.5rem',
        29: '7.25rem',
        33: '8.25rem',
        '51.75': '12.9375rem',
        108: '27rem',
        150: '37.5rem',
      },
      borderRadius: {
        pill: '9999px',
        panel: '1rem',
        card: '1rem',
      },
      boxShadow: {
        panel: '0 16px 40px rgba(0, 0, 0, 0.28)',
        overlay: '0 24px 64px rgba(0, 0, 0, 0.45)',
      },
      zIndex: {
        overlay: '50',
        sticky: '40',
      },
      fontSize: {
        'label-xs': ['0.625rem', { lineHeight: '0.75rem' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'body-md': ['1rem', { lineHeight: '1.5rem' }],
        'title-sm': ['1rem', { lineHeight: '1.5rem', fontWeight: '700' }],
        'title-md': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '500' }],
        'title-lg': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
      },
    },
  },
}
