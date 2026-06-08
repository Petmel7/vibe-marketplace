import { z } from 'zod'

const booleanFlagSchema = z
  .union([z.boolean(), z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (!value) return false

    const normalized = value.trim().toLowerCase()
    return ['1', 'true', 'yes', 'on'].includes(normalized)
  })

const optionalBooleanSettingSchema = z
  .union([z.boolean(), z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0

    const normalized = value.trim().toLowerCase()
    return ['1', 'true', 'yes', 'on'].includes(normalized)
  })

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

const serverEnvSchema = publicEnvSchema
  .extend({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1).optional(),
    SUPABASE_URL: z.url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    LIQPAY_PUBLIC_KEY: z.string().min(1).optional(),
    LIQPAY_PRIVATE_KEY: z.string().min(1).optional(),
    NOVA_POSHTA_API_KEY: z.string().min(1).optional(),
    NOVA_POSHTA_API_URL: z.url().optional(),
    NOVA_POSHTA_CACHE_ENABLED: optionalBooleanSettingSchema,
    NOVA_POSHTA_CACHE_TTL_SECONDS: z.coerce.number().int().positive().optional(),
    APP_URL: z.url().optional(),
    JOB_RUNNER_SECRET: z.string().min(1).optional(),
    EMAIL_ENABLED: booleanFlagSchema,
    PAYMENTS_ENABLED: booleanFlagSchema,
    SHIPPING_ENABLED: booleanFlagSchema,
    JOBS_ENABLED: booleanFlagSchema,
  })
  .superRefine((value, context) => {
    const requireInProduction = (
      field: keyof typeof value,
      message = `Missing environment variable: ${field}`,
    ) => {
      if (value.NODE_ENV === 'production' && !value[field]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message,
        })
      }
    }

    requireInProduction('DATABASE_URL')
    requireInProduction('SUPABASE_URL')
    requireInProduction('SUPABASE_SERVICE_ROLE_KEY')
    requireInProduction('APP_URL')

    if (value.EMAIL_ENABLED && !value.RESEND_API_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['RESEND_API_KEY'],
        message: 'RESEND_API_KEY is required when EMAIL_ENABLED is true',
      })
    }

    if (value.PAYMENTS_ENABLED) {
      if (!value.LIQPAY_PUBLIC_KEY) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['LIQPAY_PUBLIC_KEY'],
          message: 'LIQPAY_PUBLIC_KEY is required when PAYMENTS_ENABLED is true',
        })
      }

      if (!value.LIQPAY_PRIVATE_KEY) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['LIQPAY_PRIVATE_KEY'],
          message: 'LIQPAY_PRIVATE_KEY is required when PAYMENTS_ENABLED is true',
        })
      }
    }

    if (value.SHIPPING_ENABLED && !value.NOVA_POSHTA_API_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NOVA_POSHTA_API_KEY'],
        message: 'NOVA_POSHTA_API_KEY is required when SHIPPING_ENABLED is true',
      })
    }

    if (value.JOBS_ENABLED && !value.JOB_RUNNER_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JOB_RUNNER_SECRET'],
        message: 'JOB_RUNNER_SECRET is required when JOBS_ENABLED is true',
      })
    }
  })

export type PublicEnv = z.output<typeof publicEnvSchema>
export type ServerEnv = z.output<typeof serverEnvSchema>
type EnvSource = Record<string, string | undefined>

type PublicEnvDiagnostics = {
  valid: true
  env: PublicEnv
} | {
  valid: false
  issues: Array<{ path: string; message: string }>
}

function toIssueList(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

function getPublicEnvSource(): EnvSource {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

function formatPublicEnvErrorMessage(issues: Array<{ path: string; message: string }>) {
  const missingKeys = issues.map((issue) => issue.path).filter(Boolean)
  const keysText =
    missingKeys.length > 0
      ? missingKeys.join(', ')
      : 'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
  const resolution =
    `Add ${keysText} to .env.local or .env, restart the dev server, and clear .next if the old values still persist.`

  if (process.env.NODE_ENV === 'production') {
    return `Missing required public environment configuration. ${resolution}`
  }

  return `Supabase public environment variables are not configured. ${resolution}`
}

export function parsePublicEnv(source: EnvSource): PublicEnv {
  return publicEnvSchema.parse(source)
}

export function parseServerEnv(source: EnvSource): ServerEnv {
  return serverEnvSchema.parse(source)
}

export function getPublicEnvDiagnostics(source: EnvSource = getPublicEnvSource()): PublicEnvDiagnostics {
  const parsed = publicEnvSchema.safeParse(source)

  if (!parsed.success) {
    return {
      valid: false,
      issues: toIssueList(parsed.error),
    }
  }

  return {
    valid: true,
    env: parsed.data,
  }
}

export function getServerEnvDiagnostics(source: EnvSource = process.env) {
  const parsed = serverEnvSchema.safeParse(source)

  if (!parsed.success) {
    return {
      valid: false as const,
      issues: toIssueList(parsed.error),
    }
  }

  const env = parsed.data

  return {
    valid: true as const,
    env,
    required: {
      databaseUrl: Boolean(env.DATABASE_URL),
      supabaseUrl: Boolean(env.SUPABASE_URL),
      supabaseServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      appUrl: Boolean(env.APP_URL),
      publicSupabaseUrl: Boolean(env.NEXT_PUBLIC_SUPABASE_URL),
      publicSupabaseAnonKey: Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
    providers: {
      resend: Boolean(env.RESEND_API_KEY),
      liqpay: Boolean(env.LIQPAY_PUBLIC_KEY && env.LIQPAY_PRIVATE_KEY),
      novaPoshta: Boolean(env.NOVA_POSHTA_API_KEY),
      jobRunnerSecret: Boolean(env.JOB_RUNNER_SECRET),
    },
    featureFlags: {
      emailEnabled: env.EMAIL_ENABLED,
      paymentsEnabled: env.PAYMENTS_ENABLED,
      shippingEnabled: env.SHIPPING_ENABLED,
      jobsEnabled: env.JOBS_ENABLED,
    },
  }
}

let cachedPublicEnv: PublicEnv | null = null
let cachedServerEnv: ServerEnv | null = null

export function getPublicEnv(): PublicEnv & { supabaseUrl: string; supabaseAnonKey: string } {
  cachedPublicEnv ??= (() => {
    const diagnostics = getPublicEnvDiagnostics(getPublicEnvSource())

    if (!diagnostics.valid) {
      const message = formatPublicEnvErrorMessage(diagnostics.issues)

      if (process.env.NODE_ENV !== 'production') {
        console.error('[env] public env validation failed', {
          issues: diagnostics.issues,
        })
      }

      throw new Error(message)
    }

    return diagnostics.env
  })()

  return {
    ...cachedPublicEnv,
    supabaseUrl: cachedPublicEnv.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: cachedPublicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() can only be used on the server')
  }

  cachedServerEnv ??= parseServerEnv(process.env)
  return cachedServerEnv
}

export const env = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    return getPublicEnv().NEXT_PUBLIC_SUPABASE_URL
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return getPublicEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY
  },
  get supabaseUrl() {
    return getPublicEnv().supabaseUrl
  },
  get supabaseAnonKey() {
    return getPublicEnv().supabaseAnonKey
  },
}

export function getFeatureFlags() {
  const serverEnv = getServerEnv()

  return {
    emailEnabled: serverEnv.EMAIL_ENABLED,
    paymentsEnabled: serverEnv.PAYMENTS_ENABLED,
    shippingEnabled: serverEnv.SHIPPING_ENABLED,
    jobsEnabled: serverEnv.JOBS_ENABLED,
  }
}
