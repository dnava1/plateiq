export const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin')
  return Boolean(origin) && origin === new URL(request.url).origin
}
