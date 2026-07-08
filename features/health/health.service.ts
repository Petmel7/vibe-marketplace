import { getServerEnvDiagnostics } from '@/config/env'
import type { DeepHealthStatusDto, HealthStatusDto } from '@/features/health/health.dto'
import { pingDatabase } from '@/features/health/health.repository'
import { getStorageReadinessDiagnostics } from '@/features/media/storage.config'
import { logInfo } from '@/utils/logger'

function getBaseHealthFields() {
  return {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  }
}

export async function getHealthStatus(): Promise<HealthStatusDto> {
  logInfo('health:get-health-status:before-return', {
    domain: 'health',
    route: '/admin/operations',
  })
  return {
    status: 'ok',
    ...getBaseHealthFields(),
  }
}

export async function getDeepHealthStatus(): Promise<DeepHealthStatusDto> {
  logInfo('health:get-deep-health-status:start', {
    domain: 'health',
    route: '/admin/operations',
  })
  const envDiagnostics = getServerEnvDiagnostics()
  const storageDiagnostics = getStorageReadinessDiagnostics()

  let databaseOk = false

  try {
    logInfo('health:get-deep-health-status:before-ping-database', {
      domain: 'health',
      route: '/admin/operations',
    })
    databaseOk = await pingDatabase()
    logInfo('health:get-deep-health-status:after-ping-database', {
      domain: 'health',
      route: '/admin/operations',
      databaseOk,
    })
  } catch {
    databaseOk = false
    logInfo('health:get-deep-health-status:ping-database-failed', {
      domain: 'health',
      route: '/admin/operations',
    })
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

  const result: DeepHealthStatusDto = {
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

  logInfo('health:get-deep-health-status:before-return', {
    domain: 'health',
    route: '/admin/operations',
    status: result.status,
    envOk: result.env.ok,
    storageOk: result.storage.ok,
  })

  return result
}
