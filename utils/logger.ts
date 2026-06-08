type LogLevel = 'info' | 'warn' | 'error'

type LogContext = {
  domain?: string
  requestId?: string | null
  [key: string]: unknown
}

type SerializedError = {
  name: string
  message: string
  stack?: string
}

const REDACTED_KEYS = ['authorization', 'cookie', 'password', 'secret', 'token', 'key']

function shouldRedact(key: string) {
  const normalized = key.toLowerCase()
  return REDACTED_KEYS.some((fragment) => normalized.includes(fragment))
}

function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]'
  if (value == null) return value
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (value instanceof Error) {
    return serializeError(value)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForLog(entry, depth + 1))
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        shouldRedact(key) ? '[redacted]' : sanitizeForLog(nestedValue, depth + 1),
      ]),
    )
  }

  return String(value)
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    name: 'UnknownError',
    message: typeof error === 'string' ? error : 'Unknown error',
  }
}

function writeLog(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: context ? sanitizeForLog(context) : undefined,
    error: error ? sanitizeForLog(error) : undefined,
  }

  const method =
    level === 'info' ? console.info : level === 'warn' ? console.warn : console.error

  method(JSON.stringify(payload))
}

export function logInfo(message: string, context?: LogContext): void {
  writeLog('info', message, context)
}

export function logWarn(message: string, context?: LogContext, error?: unknown): void {
  writeLog('warn', message, context, error)
}

export function logError(message: string, error: unknown, context?: LogContext): void {
  writeLog('error', message, context, error)
}
