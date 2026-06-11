import { getServerEnvDiagnostics } from '@/config/env'
import type { DeepHealthStatusDto, HealthStatusDto } from '@/features/health/health.dto'
import { pingDatabase } from '@/features/health/health.repository'
import { getStorageReadinessDiagnostics } from '@/features/media/storage.config'

function getBaseHealthFields() {
  return {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  }
}

export async function getHealthStatus(): Promise<HealthStatusDto> {
  return {
    status: 'ok',
    ...getBaseHealthFields(),
  }
}

export async function getDeepHealthStatus(): Promise<DeepHealthStatusDto> {
  const envDiagnostics = getServerEnvDiagnostics()
  const storageDiagnostics = getStorageReadinessDiagnostics()

  let databaseOk = false

  try {
    databaseOk = await pingDatabase()
  } catch {
    databaseOk = false
  }

  const providers =
    envDiagnostics.valid
      ? {
          resendConfigured: envDiagnostics.providers.resend,
          liqpayConfigured: envDiagnostics.providers.liqpay,
          novaPoshtaConfigured: envDiagnostics.providers.novaPoshta,
        }
      : {
          resendConfigured: false,
          liqpayConfigured: false,
          novaPoshtaConfigured: false,
        }

  const featureFlags =
    envDiagnostics.valid
      ? envDiagnostics.featureFlags
      : {
          emailEnabled: false,
          paymentsEnabled: false,
          shippingEnabled: false,
          jobsEnabled: false,
        }

  return {
    status: databaseOk && envDiagnostics.valid && storageDiagnostics.ok ? 'ok' : 'degraded',
    ...getBaseHealthFields(),
    database: {
      ok: databaseOk,
    },
    env: {
      ok: envDiagnostics.valid,
      issues: envDiagnostics.valid ? [] : envDiagnostics.issues,
    },
    providers,
    storage: storageDiagnostics,
    featureFlags,
  }
}
