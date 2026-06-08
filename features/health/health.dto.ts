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
  featureFlags: {
    emailEnabled: boolean
    paymentsEnabled: boolean
    shippingEnabled: boolean
    jobsEnabled: boolean
  }
}
