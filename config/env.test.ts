import { beforeEach, describe, expect, it, vi } from 'vitest'

async function loadEnvModule() {
  return import('@/config/env')
}

describe('config/env', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  it('parses public env values', async () => {
    const { parsePublicEnv } = await loadEnvModule()
    const env = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    })

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co')
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('anon-key')
  })

  it('reads public env from explicit NEXT_PUBLIC process.env keys by default', async () => {
    const { getPublicEnvDiagnostics } = await loadEnvModule()
    const diagnostics = getPublicEnvDiagnostics()

    expect(diagnostics.valid).toBe(true)
    if (diagnostics.valid) {
      expect(diagnostics.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co')
      expect(diagnostics.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('anon-key')
    }
  })

  it('allows local development defaults without provider secrets when features are disabled', async () => {
    const { parseServerEnv } = await loadEnvModule()
    const env = parseServerEnv({
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    })

    expect(env.EMAIL_ENABLED).toBe(false)
    expect(env.PAYMENTS_ENABLED).toBe(false)
    expect(env.SHIPPING_ENABLED).toBe(false)
    expect(env.JOBS_ENABLED).toBe(false)
  })

  it('fails fast in production when required env is missing', async () => {
    const { parseServerEnv } = await loadEnvModule()

    expect(() =>
      parseServerEnv({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
    ).toThrow()
  })

  it('returns a clear public env error message with recovery steps', async () => {
    const { getPublicEnv } = await loadEnvModule()

    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    expect(() => getPublicEnv()).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL.*NEXT_PUBLIC_SUPABASE_ANON_KEY.*restart the dev server.*clear \.next/i,
    )
  })

  it('reports validation issues for enabled provider features with missing secrets', async () => {
    const { getServerEnvDiagnostics } = await loadEnvModule()
    const diagnostics = getServerEnvDiagnostics({
      NODE_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      APP_URL: 'https://marketplace.example.com',
      EMAIL_ENABLED: 'true',
      PAYMENTS_ENABLED: 'true',
      SHIPPING_ENABLED: 'true',
      JOBS_ENABLED: 'true',
    })

    expect(diagnostics.valid).toBe(false)
    if (!diagnostics.valid) {
      expect(diagnostics.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'RESEND_API_KEY' }),
          expect.objectContaining({ path: 'LIQPAY_PUBLIC_KEY' }),
          expect.objectContaining({ path: 'LIQPAY_PRIVATE_KEY' }),
          expect.objectContaining({ path: 'NOVA_POSHTA_API_KEY' }),
          expect.objectContaining({ path: 'JOB_RUNNER_SECRET' }),
        ]),
      )
    }
  })
})
