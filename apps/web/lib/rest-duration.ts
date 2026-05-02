export const MAX_REST_DURATION_SECONDS = 5 * 60

const UNIT_DURATION_PATTERN = /^(?:(\d+)\s*h(?:ours?)?)?\s*(?:(\d+)\s*m(?:in(?:ute)?s?)?)?\s*(?:(\d+)\s*s(?:ec(?:ond)?s?)?)?$/i

export function normalizeRestDurationSeconds(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null
  }

  return Math.floor(value)
}

export function formatRestDurationInput(totalSeconds: number | null | undefined) {
  const normalizedSeconds = normalizeRestDurationSeconds(totalSeconds)

  if (normalizedSeconds === null) {
    return ''
  }

  const hours = Math.floor(normalizedSeconds / 3600)
  const minutes = Math.floor((normalizedSeconds % 3600) / 60)
  const seconds = normalizedSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function parseRestDurationInput(value: string) {
  const trimmedValue = value.trim()

  if (trimmedValue.length === 0) {
    return null
  }

  const colonParts = trimmedValue.split(':')

  if (colonParts.length === 2 || colonParts.length === 3) {
    const numericParts = colonParts.map((part) => Number(part))
    const hasInvalidPart = numericParts.some((part, index) => {
      if (!Number.isInteger(part) || part < 0) {
        return true
      }

      return index > 0 && part >= 60
    })

    if (hasInvalidPart) {
      return Number.NaN
    }

    if (colonParts.length === 2) {
      const [minutes, seconds] = numericParts as [number, number]
      return minutes * 60 + seconds
    }

    const [hours, minutes, seconds] = numericParts as [number, number, number]
    return hours * 3600 + minutes * 60 + seconds
  }

  const unitMatch = UNIT_DURATION_PATTERN.exec(trimmedValue)

  if (unitMatch && (unitMatch[1] || unitMatch[2] || unitMatch[3])) {
    const hours = unitMatch[1] ? Number(unitMatch[1]) : 0
    const minutes = unitMatch[2] ? Number(unitMatch[2]) : 0
    const seconds = unitMatch[3] ? Number(unitMatch[3]) : 0

    return hours * 3600 + minutes * 60 + seconds
  }

  const numericValue = Number(trimmedValue)

  if (Number.isFinite(numericValue) && numericValue >= 0) {
    return Math.round(numericValue * 60)
  }

  return Number.NaN
}

export function isValidRestDurationSeconds(value: number | null | undefined) {
  if (value === null || typeof value === 'undefined') {
    return true
  }

  return Number.isInteger(value)
    && value >= 0
    && value <= MAX_REST_DURATION_SECONDS
}
