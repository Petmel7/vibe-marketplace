export type HealthStatusDto = {
  status: 'ok'
  timestamp: string
  uptimeSeconds: number
}

export type DeepHealthStatusDto = {
  status: 'ok' | 'degraded'
  timestamp: string
  uptimeSeconds: number
  database: {
    ok: boolean
  }
  env: {
    ok: boolean
    issues: Array<{ path: string; message: string }>
  }
  providers: {
    resendConfigured: boolean
    liqpayConfigured: boolean
    novaPoshtaConfigured: boolean
  }
  storage: {
    ok: boolean
    buckets: Array<{
      bucket: string
      visibility: 'public' | 'private'
      uploadActors: string[]
      readActors: string[]
      usesSignedUrls: boolean
    }>
    issues: string[]
  }
  featureFlags: {
    emailEnabled: boolean
    paymentsEnabled: boolean
    shippingEnabled: boolean
    jobsEnabled: boolean
  }
}
