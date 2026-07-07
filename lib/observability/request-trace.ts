import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'

export type RequestTraceContext = {
  requestId: string
  route?: string
  operation?: string
}

const requestTraceStorage = new AsyncLocalStorage<RequestTraceContext>()

function normalizeTraceValue(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function getCurrentRequestTrace(): RequestTraceContext | undefined {
  return requestTraceStorage.getStore()
}

export function runWithRequestTrace<T>(
  context: Partial<RequestTraceContext>,
  run: () => T | Promise<T>,
): T | Promise<T> {
  const parent = getCurrentRequestTrace()
  const requestId =
    normalizeTraceValue(context.requestId) ??
    normalizeTraceValue(parent?.requestId) ??
    randomUUID()

  const nextContext: RequestTraceContext = {
    requestId,
    route: normalizeTraceValue(context.route) ?? normalizeTraceValue(parent?.route),
    operation: normalizeTraceValue(context.operation) ?? normalizeTraceValue(parent?.operation),
  }

  return requestTraceStorage.run(nextContext, run)
}
