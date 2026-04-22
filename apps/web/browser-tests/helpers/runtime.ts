export const DEFAULT_PLAYWRIGHT_PORT = '3100'

export function getPlaywrightPort() {
  return process.env.PLAYWRIGHT_PORT ?? DEFAULT_PLAYWRIGHT_PORT
}

export function getPlaywrightBaseUrl() {
  return process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${getPlaywrightPort()}`
}