/**
 * UZS currency formatter for TutorSpace
 * Format: "120 000 so'm"
 */

/**
 * Format a number as UZS (Uzbek Som)
 * @param {number} amount - amount in so'm
 * @param {boolean} compact - use compact format (120K so'm)
 */
export function formatUZS(amount, compact = false) {
  const currencySuffix = 'UZS'
  if (amount === null || amount === undefined) return `0 ${currencySuffix}`

  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (compact && abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace('.0', '')} mln ${currencySuffix}`
  }
  if (compact && abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)}K ${currencySuffix}`
  }

  // Space-separated thousands: 1 200 000 UZS
  const formatted = abs
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

  return `${sign}${formatted} ${currencySuffix}`
}

/**
 * Format for input placeholder (just the number, no suffix)
 */
export function formatUZSNumber(amount) {
  return Math.abs(amount)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Format a raw string/number as space-separated digits (e.g. 200000 -> "200 000")
 */
export function formatNumberWithSpaces(val) {
  if (val === null || val === undefined || val === '') return ''
  const clean = String(val).replace(/\D/g, '')
  if (!clean) return ''
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Parse a space-separated string back to numeric string (e.g. "200 000" -> "200000")
 */
export function parseFormattedNumber(val) {
  if (!val) return ''
  return String(val).replace(/\D/g, '')
}

// Common presets (in UZS)
export const UZS = {
  sessionFee: 120_000,
  monthlyRate: 200_000,
  teacherMonthly: 3_240_000,
  outstanding: 450_000,
  debt: -145_000,
  balance: 240_000,
}
