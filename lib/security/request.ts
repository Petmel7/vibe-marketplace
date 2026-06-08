export function getRequestId(request: Request): string | null {
  return request.headers.get('x-request-id')
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(',')
    if (firstIp?.trim()) {
      return firstIp.trim()
    }
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp?.trim()) {
    return realIp.trim()
  }

  return 'unknown'
}
