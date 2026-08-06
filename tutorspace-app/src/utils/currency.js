/**
 * UZS currency formatter for TutorSpace
 * Format: "120 000 so'm"
 */

/**
 * Format a number as UZS (Uzbek Som)
 * @param {number} amount - amount in so'm
 * @param {boolean} compact - use compact format (120K so'm)
 */
export function formatUZS(amount, compact = false, lang = 'ru') {
  const currencySuffix = lang === 'ru' ? 'сум' : "so'm"
  if (amount === null || amount === undefined) return `0 ${currencySuffix}`

  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (compact && abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace('.0', '')} ${lang === 'ru' ? 'млн сум' : 'mln so\'m'}`
  }
  if (compact && abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)}K ${currencySuffix}`
  }

  // Space-separated thousands: 1 200 000 сум / so'm
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

// Common presets (in UZS)
export const UZS = {
  sessionFee: 120_000,
  monthlyRate: 200_000,
  teacherMonthly: 3_240_000,
  outstanding: 450_000,
  debt: -145_000,
  balance: 240_000,
}
