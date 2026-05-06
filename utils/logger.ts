/**
 * Shared server-side error logger.
 * Centralises console.error calls so we can swap the sink later (e.g. Sentry).
 */
export function logError(label: string, error: unknown): void {
  console.error(`[${label}] Unexpected error:`, error)
}
